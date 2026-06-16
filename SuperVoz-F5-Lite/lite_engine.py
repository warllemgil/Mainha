import json
import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from threading import Lock
from typing import Any

import numpy as np
import onnxruntime as ort
import soundfile as sf
import torch

from voice_manager import ResolvedVoice, VoiceConfig, resolve_voice


LOGGER = logging.getLogger("supervoz_lite.engine")
PROJECT_ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = Path(os.getenv("SUPERVOZ_OUTPUT_DIR", PROJECT_ROOT / "outputs"))

DEFAULT_LITE_NFE_STEP = int(os.getenv("SUPERVOZ_LITE_NFE_STEP", "4"))
MIN_LITE_NFE_STEP = 4
MAX_LITE_NFE_STEP = 16


@dataclass(frozen=True)
class TTSResult:
    output_path: Path
    generation_time_seconds: float
    device: str
    nfe_step: int
    speed: float


class F5LiteEngine:
    def __init__(self) -> None:
        self.device = "cpu"
        self.execution_provider = "CPUExecutionProvider"
        self._loaded: dict[str, tuple[ResolvedVoice, object, ort.InferenceSession]] = {}
        self._lock = Lock()
        LOGGER.info("Modo Lite inicializado em CPU com F5-TTS Python e ONNX Runtime core")

    @property
    def model_loaded(self) -> bool:
        return bool(self._loaded)

    def preload(self, voices: dict[str, VoiceConfig]) -> None:
        for config in voices.values():
            self.get_voice(config)

    def get_voice(self, config: VoiceConfig) -> tuple[ResolvedVoice, object, ort.InferenceSession]:
        with self._lock:
            cached = self._loaded.get(config.voice_id)
            if cached:
                return cached

            resolved = resolve_voice(config)
            session_options = ort.SessionOptions()
            session_options.graph_optimization_level = ort.GraphOptimizationLevel.ORT_ENABLE_ALL
            session_options.intra_op_num_threads = int(os.getenv("ORT_NUM_THREADS", "2"))
            session_options.inter_op_num_threads = 1
            session = ort.InferenceSession(
                str(resolved.onnx_model_path),
                sess_options=session_options,
                providers=[self.execution_provider],
            )
            validate_onnx_core(session)

            from f5_tts.api import F5TTS

            model = F5TTS(
                model="F5TTS_v1_Base",
                ckpt_file=str(resolved.model_path),
                vocab_file=str(resolved.vocab_path),
                device=self.device,
            )
            self._loaded[config.voice_id] = (resolved, model, session)
            LOGGER.info(
                "Voz Lite carregada: %s onnx_providers=%s torch_cuda=%s",
                config.voice_id,
                session.get_providers(),
                torch.cuda.is_available(),
            )
            return resolved, model, session

    def synthesize(
        self,
        config: VoiceConfig,
        text: str,
        *,
        speed: float | None = None,
        mode: str | None = None,
        nfe_step: int | None = None,
    ) -> TTSResult:
        text = (text or "").strip()
        if not text:
            raise ValueError("O campo text nao pode ficar vazio.")

        selected_nfe = clamp_lite_nfe(nfe_step or DEFAULT_LITE_NFE_STEP)
        selected_speed = speed if speed is not None else config.speed
        resolved, model, _session = self.get_voice(config)

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_path = OUTPUT_DIR / f"{config.voice_id}_lite_{int(time.time() * 1000)}.wav"
        chunks = split_text(text, max_chars=int(os.getenv("SUPERVOZ_LITE_MAX_CHARS", "160")))
        generation_text = "\n".join(chunks)

        start = time.perf_counter()
        LOGGER.info(
            "Gerando TTS Lite voice=%s chars=%s chunks=%s nfe_step=%s speed=%s",
            config.voice_id,
            len(text),
            len(chunks),
            selected_nfe,
            selected_speed,
        )

        model.infer(
            ref_file=str(resolved.ref_audio_path),
            ref_text=resolved.ref_text,
            gen_text=generation_text,
            nfe_step=selected_nfe,
            speed=selected_speed,
            file_wave=str(output_path),
            progress=None,
            show_info=LOGGER.info,
        )
        if not output_path.exists() or output_path.stat().st_size <= 0:
            raise RuntimeError("F5-TTS nao gerou um arquivo de audio valido.")
        normalize_output_audio(output_path)

        elapsed = time.perf_counter() - start
        LOGGER.info("Audio Lite gerado em %.2fs: %s", elapsed, output_path)
        return TTSResult(
            output_path=output_path,
            generation_time_seconds=elapsed,
            device=self.device,
            nfe_step=selected_nfe,
            speed=selected_speed,
        )


def validate_onnx_core(session: ort.InferenceSession) -> None:
    input_names = {item.name for item in session.get_inputs()}
    output_names = {item.name for item in session.get_outputs()}
    expected_inputs = {"x", "cond", "text", "time", "mask"}
    if not expected_inputs.issubset(input_names) or "pred" not in output_names:
        LOGGER.warning(
            "Contrato ONNX inesperado. inputs=%s outputs=%s",
            sorted(input_names),
            sorted(output_names),
        )
        return

    feed: dict[str, Any] = {}
    for item in session.get_inputs():
        dtype = np_dtype(item.type)
        shape = concrete_shape(item.shape)
        if dtype == np.dtype("bool"):
            feed[item.name] = np.ones(shape, dtype=dtype)
        elif np.issubdtype(dtype, np.integer):
            feed[item.name] = np.ones(shape, dtype=dtype)
        else:
            feed[item.name] = np.zeros(shape, dtype=dtype)
    outputs = session.run(None, feed)
    LOGGER.info(
        "ONNX core validado em CPU: inputs=%s outputs=%s first_output_shape=%s",
        sorted(input_names),
        sorted(output_names),
        list(np.asarray(outputs[0]).shape) if outputs else [],
    )


def run_onnx_tts(
    session: ort.InferenceSession,
    *,
    text: str,
    ref_text: str,
    speed: float,
    nfe_step: int,
) -> tuple[np.ndarray, int]:
    inputs = {item.name: item for item in session.get_inputs()}
    feed: dict[str, Any] = {}

    text_ids = encode_text(text)
    ref_text_ids = encode_text(ref_text)

    for name, meta in inputs.items():
        lowered = name.lower()
        shape = concrete_shape(meta.shape)
        dtype = np_dtype(meta.type)

        if lowered in {"text", "text_ids", "gen_text", "tokens", "input_ids"}:
            feed[name] = text_ids.reshape(shape_for_vector(shape, text_ids.size)).astype(dtype)
        elif lowered in {"text_lengths", "text_len", "gen_text_lengths", "input_lengths"}:
            feed[name] = np.asarray([text_ids.size], dtype=dtype)
        elif lowered in {"ref_text", "ref_text_ids", "ref_tokens"}:
            feed[name] = ref_text_ids.reshape(shape_for_vector(shape, ref_text_ids.size)).astype(dtype)
        elif lowered in {"ref_text_lengths", "ref_text_len"}:
            feed[name] = np.asarray([ref_text_ids.size], dtype=dtype)
        elif lowered in {"speed", "pace"}:
            feed[name] = np.asarray([speed], dtype=dtype)
        elif lowered in {"n_steps", "nfe_step", "steps", "sampling_steps"}:
            feed[name] = np.asarray([nfe_step], dtype=dtype)
        else:
            raise RuntimeError(
                "Entrada ONNX nao mapeada: "
                f"{name} shape={meta.shape} type={meta.type}. "
                "Exporte o modelo Lite com nomes de entrada text_ids/text_lengths/ref_text_ids/ref_text_lengths/speed/n_steps, "
                "ou ajuste run_onnx_tts para o contrato do seu grafo."
            )

    outputs = session.run(None, feed)
    audio = select_audio_output(outputs)
    sample_rate = select_sample_rate_output(session, outputs)
    return audio, sample_rate


def encode_text(text: str) -> np.ndarray:
    clean = (text or "").strip()
    if not clean:
        return np.asarray([0], dtype=np.int64)
    return np.fromiter((ord(char) for char in clean), dtype=np.int64)


def concrete_shape(shape: list[Any]) -> list[int]:
    values: list[int] = []
    for value in shape:
        if isinstance(value, int) and value > 0:
            values.append(value)
        else:
            values.append(1)
    return values


def shape_for_vector(shape: list[int], length: int) -> tuple[int, ...]:
    if len(shape) <= 1:
        return (length,)
    return (1, length)


def np_dtype(onnx_type: str) -> np.dtype:
    if "bool" in onnx_type:
        return np.dtype("bool")
    if "int64" in onnx_type:
        return np.dtype("int64")
    if "int32" in onnx_type:
        return np.dtype("int32")
    if "float16" in onnx_type:
        return np.dtype("float16")
    if "double" in onnx_type:
        return np.dtype("float64")
    return np.dtype("float32")


def select_audio_output(outputs: list[Any]) -> np.ndarray:
    for output in outputs:
        array = np.asarray(output)
        if array.size > 1000 and np.issubdtype(array.dtype, np.number):
            audio = np.squeeze(array).astype(np.float32)
            if audio.ndim == 1:
                return audio
            if audio.ndim == 2:
                return audio[0]
    raise RuntimeError("O modelo ONNX nao retornou um tensor de audio reconhecivel.")


def select_sample_rate_output(session: ort.InferenceSession, outputs: list[Any]) -> int:
    names = [output.name.lower() for output in session.get_outputs()]
    for name, value in zip(names, outputs):
        if name in {"sample_rate", "sampling_rate", "sr"}:
            return int(np.asarray(value).reshape(-1)[0])
    return int(os.getenv("SUPERVOZ_LITE_SAMPLE_RATE", "24000"))


def split_text(text: str, max_chars: int = 160) -> list[str]:
    pieces = [piece.strip() for piece in re.split(r"(?<=[.!?;:])\s+", text.strip()) if piece.strip()]
    chunks: list[str] = []
    current = ""
    for piece in pieces or [text.strip()]:
        if len(piece) > max_chars:
            if current:
                chunks.append(current)
                current = ""
            chunks.extend(piece[i : i + max_chars].strip() for i in range(0, len(piece), max_chars))
            continue
        candidate = f"{current} {piece}".strip()
        if current and len(candidate) > max_chars:
            chunks.append(current)
            current = piece
        else:
            current = candidate
    if current:
        chunks.append(current)
    return chunks


def concatenate_audio(parts: list[np.ndarray], sample_rate: int) -> np.ndarray:
    if len(parts) == 1:
        return parts[0]
    silence = np.zeros(max(1, int(sample_rate * 0.08)), dtype=np.float32)
    merged: list[np.ndarray] = []
    for part in parts:
        if merged:
            merged.append(silence)
        merged.append(part)
    return np.concatenate(merged)


def clamp_lite_nfe(value: int) -> int:
    return max(MIN_LITE_NFE_STEP, min(MAX_LITE_NFE_STEP, int(value)))


def normalize_output_audio(path: Path, target_peak: float = 0.92) -> None:
    data, sample_rate = sf.read(str(path), always_2d=False)
    if data.size == 0:
        return

    peak = float(abs(data).max())
    if peak <= 0:
        return
    if peak > target_peak:
        data = data * (target_peak / peak)
    sf.write(str(path), data, sample_rate)
