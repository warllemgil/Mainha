import logging
import time
from dataclasses import dataclass
from pathlib import Path
from threading import Lock

import torch

from voice_manager import ResolvedVoice, VoiceConfig, resolve_voice


LOGGER = logging.getLogger("supervoz.f5_engine")
PROJECT_ROOT = Path(__file__).resolve().parent
OUTPUT_DIR = PROJECT_ROOT / "outputs"


@dataclass(frozen=True)
class TTSResult:
    voice_id: str
    text: str
    output_path: Path
    generation_time_seconds: float
    device: str
    nfe_step: int
    speed: float


class F5Engine:
    def __init__(self) -> None:
        self._loaded: dict[str, tuple[ResolvedVoice, object]] = {}
        self._lock = Lock()
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        LOGGER.info("Dispositivo selecionado: %s", self.device)

    def preload(self, voices: dict[str, VoiceConfig]) -> None:
        for voice_id in voices:
            self.get_voice(voices[voice_id])

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
            LOGGER.info("Voz carregada: %s", config.voice_id)
            return resolved, model

    def synthesize(
        self,
        config: VoiceConfig,
        text: str,
        *,
        nfe_step: int | None = None,
        speed: float | None = None,
        economy: bool = False,
    ) -> TTSResult:
        if not text or not text.strip():
            raise ValueError("O campo text nao pode ficar vazio.")

        resolved, model = self.get_voice(config)
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        selected_nfe_step = nfe_step if nfe_step is not None else self.default_nfe_step(economy)
        selected_speed = speed if speed is not None else resolved.config.speed
        output_path = OUTPUT_DIR / f"{config.voice_id}_{int(time.time() * 1000)}.wav"

        start = time.perf_counter()
        LOGGER.info(
            "Gerando TTS voice=%s chars=%s nfe_step=%s speed=%s output=%s",
            config.voice_id,
            len(text),
            selected_nfe_step,
            selected_speed,
            output_path,
        )
        model.infer(
            ref_file=str(resolved.ref_audio_path),
            ref_text=resolved.ref_text,
            gen_text=text.strip(),
            nfe_step=selected_nfe_step,
            speed=selected_speed,
            file_wave=str(output_path),
            progress=None,
            show_info=LOGGER.info,
        )
        elapsed = time.perf_counter() - start
        LOGGER.info("Audio gerado em %.2fs: %s", elapsed, output_path)

        return TTSResult(
            voice_id=config.voice_id,
            text=text.strip(),
            output_path=output_path,
            generation_time_seconds=elapsed,
            device=self.device,
            nfe_step=selected_nfe_step,
            speed=selected_speed,
        )

    def default_nfe_step(self, economy: bool) -> int:
        if self.device == "cpu":
            return 12 if economy else 16
        return 16 if economy else 32
