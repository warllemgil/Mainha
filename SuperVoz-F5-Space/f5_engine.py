import logging
import os
import re
import time
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import torch
import soundfile as sf

from voice_manager import ResolvedVoice, VoiceConfig, resolve_voice


LOGGER = logging.getLogger("supervoz.f5_engine")
PROJECT_ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = Path(os.getenv("SUPERVOZ_OUTPUT_DIR", PROJECT_ROOT / "outputs"))

MODE_NFE = {
    "fast": {"cpu": 8, "cuda": 16},
    "balanced": {"cpu": 16, "cuda": 32},
    "quality": {"cpu": 24, "cuda": 48},
}


@dataclass(frozen=True)
class TTSResult:
    output_path: Path
    generation_time_seconds: float
    device: str
    nfe_step: int
    speed: float


class F5Engine:
    def __init__(self) -> None:
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self._loaded: dict[str, tuple[ResolvedVoice, object]] = {}
        self._lock = Lock()
        LOGGER.info("Dispositivo selecionado: %s", self.device)

    @property
    def model_loaded(self) -> bool:
        return bool(self._loaded)

    def preload(self, voices: dict[str, VoiceConfig]) -> None:
        for config in voices.values():
            self.get_voice(config)

    def get_voice(self, config: VoiceConfig) -> tuple[ResolvedVoice, object]:
        with self._lock:
            cached = self._loaded.get(config.voice_id)
            if cached:
                return cached

            LOGGER.info("Carregando voz %s (%s)", config.voice_id, config.name)
            resolved = resolve_voice(config)

            from f5_tts.api import F5TTS

            model = F5TTS(
                model="F5TTS_v1_Base",
                ckpt_file=str(resolved.model_path),
                vocab_file=str(resolved.vocab_path),
                device=self.device,
            )
            self._loaded[config.voice_id] = (resolved, model)
            LOGGER.info("Voz carregada em memoria: %s", config.voice_id)
            return resolved, model

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

        selected_mode = (mode or config.default_mode or "balanced").lower()
        selected_nfe = nfe_step or self.default_nfe_step(selected_mode)
        selected_speed = speed if speed is not None else config.speed

        resolved, model = self.get_voice(config)
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        output_path = OUTPUT_DIR / f"{config.voice_id}_{int(time.time() * 1000)}.wav"
        chunks = split_text(text)
        generation_text = "\n".join(chunks)

        start = time.perf_counter()
        LOGGER.info(
            "Gerando TTS voice=%s chars=%s chunks=%s mode=%s nfe_step=%s speed=%s",
            config.voice_id,
            len(text),
            len(chunks),
            selected_mode,
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
        elapsed = time.perf_counter() - start
        LOGGER.info("Audio gerado em %.2fs: %s", elapsed, output_path)

        if not output_path.exists() or output_path.stat().st_size <= 0:
            raise RuntimeError("F5-TTS nao gerou um arquivo de audio valido.")

        normalize_output_audio(output_path)

        return TTSResult(
            output_path=output_path,
            generation_time_seconds=elapsed,
            device=self.device,
            nfe_step=selected_nfe,
            speed=selected_speed,
        )

    def default_nfe_step(self, mode: str) -> int:
        table = MODE_NFE.get(mode, MODE_NFE["balanced"])
        return table["cuda" if self.device == "cuda" else "cpu"]


def split_text(text: str, max_chars: int = 240) -> list[str]:
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


def normalize_output_audio(path: Path, target_peak: float = 0.92) -> None:
    data, sample_rate = sf.read(str(path), always_2d=False)
    if data.size == 0:
        return

    peak = float(abs(data).max())
    if peak <= 0 or peak <= target_peak:
        return

    sf.write(str(path), data * (target_peak / peak), sample_rate)
    LOGGER.info("Audio normalizado para peak %.2f: %s", target_peak, path)
