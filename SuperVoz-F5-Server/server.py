import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from f5_engine import F5Engine
from voice_manager import diagnose_hf_repo, load_voices, public_voice_info


PROJECT_ROOT = Path(__file__).resolve().parent
LOG_DIR = PROJECT_ROOT / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(LOG_DIR / "server.log", encoding="utf-8"),
    ],
)
LOGGER = logging.getLogger("supervoz.server")

app = FastAPI(title="SuperVoz F5 Server", version="0.1.0")
voices = load_voices()
engine = F5Engine()


class TTSRequest(BaseModel):
    text: str = Field(..., min_length=1)
    voice_id: str = "warllem"
    speed: float | None = Field(default=None, gt=0.2, le=2.5)
    nfe_step: int | None = Field(default=None, ge=4, le=64)
    economy: bool = True


@app.on_event("startup")
def startup() -> None:
    LOGGER.info("Servidor iniciado com %s voz(es)", len(voices))
    for config in voices.values():
        diagnosis = diagnose_hf_repo(config.hf_repo, config.voice_path)
        if diagnosis["ok"]:
            LOGGER.info(
                "Diagnostico HF %s: %s arquivo(s) na voz",
                config.hf_repo,
                len(diagnosis["voice_files"]),
            )
        else:
            LOGGER.warning("Diagnostico HF falhou: %s", diagnosis["error"])

    # Carrega a voz uma vez na inicializacao. O primeiro boot pode demorar porque
    # baixa checkpoints grandes e carrega o F5-TTS em memoria.
    engine.preload(voices)


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "device": engine.device,
        "voices": len(voices),
    }


@app.get("/voices")
def list_voices() -> dict:
    return {"voices": [public_voice_info(config) for config in voices.values()]}


@app.post("/tts")
def tts(request: TTSRequest) -> dict:
    config = voices.get(request.voice_id)
    if config is None:
        raise HTTPException(status_code=404, detail=f"Voz nao encontrada: {request.voice_id}")

    try:
        result = engine.synthesize(
            config,
            request.text,
            speed=request.speed,
            nfe_step=request.nfe_step,
            economy=request.economy,
        )
    except Exception as exc:
        LOGGER.exception("Falha ao gerar TTS")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "voice_id": result.voice_id,
        "audio_path": str(result.output_path.relative_to(PROJECT_ROOT)),
        "audio_abs_path": str(result.output_path),
        "generation_time_seconds": round(result.generation_time_seconds, 3),
        "device": result.device,
        "nfe_step": result.nfe_step,
        "speed": result.speed,
    }
