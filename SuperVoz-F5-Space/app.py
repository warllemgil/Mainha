import logging
import os
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from f5_engine import F5Engine
from voice_manager import diagnose_config, load_voices, public_voice_info


PROJECT_ROOT = Path(__file__).resolve().parent
LOG_DIR = Path(os.getenv("SUPERVOZ_LOG_DIR", PROJECT_ROOT / "cache" / "logs"))
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    handlers=[logging.StreamHandler(), logging.FileHandler(LOG_DIR / "server.log", encoding="utf-8")],
)
LOGGER = logging.getLogger("supervoz.app")

app = FastAPI(title="SuperVoz F5 API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

voices = load_voices()
engine = F5Engine()
auth_scheme = HTTPBearer(auto_error=False)


class TTSRequest(BaseModel):
    voice: str = "warllem"
    text: str = Field(..., min_length=1)
    speed: float | None = Field(default=None, gt=0.2, le=2.5)
    mode: str = Field(default="balanced", pattern="^(fast|balanced|quality)$")
    nfe_step: int | None = Field(default=None, ge=4, le=64)


def require_api_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme),
) -> None:
    expected_token = os.getenv("API_AUTH_TOKEN", "").strip()
    if not expected_token:
        return

    if request.method == "OPTIONS":
        return

    token = credentials.credentials if credentials else ""
    if token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de API invalido.",
            headers={"WWW-Authenticate": "Bearer"},
        )


@app.on_event("startup")
def startup() -> None:
    LOGGER.info("Iniciando SuperVoz F5 API com %s voz(es)", len(voices))
    if env_flag("SUPERVOZ_STARTUP_DIAGNOSTIC", default=False):
        for config in voices.values():
            try:
                LOGGER.info("Diagnostico de voz %s: %s", config.voice_id, diagnose_config(config))
            except Exception as exc:
                LOGGER.warning("Diagnostico de voz falhou para %s: %s", config.voice_id, exc)

    if env_flag("SUPERVOZ_PRELOAD_ON_STARTUP", default=False):
        try:
            engine.preload(voices)
        except Exception:
            LOGGER.exception("Falha no preload. O /tts tentara carregar sob demanda.")


def env_flag(name: str, *, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "sim"}


@app.get("/health", dependencies=[Depends(require_api_token)])
def health() -> dict:
    return {
        "status": "ok",
        "device": engine.device,
        "model_loaded": engine.model_loaded,
        "space": "running",
        "auth_enabled": bool(os.getenv("API_AUTH_TOKEN", "").strip()),
        "preload_on_startup": env_flag("SUPERVOZ_PRELOAD_ON_STARTUP", default=False),
    }


@app.get("/voices", dependencies=[Depends(require_api_token)])
def list_voices() -> dict:
    return {"voices": [public_voice_info(config) for config in voices.values()]}


@app.post("/tts", dependencies=[Depends(require_api_token)])
def tts(request: TTSRequest) -> FileResponse:
    config = voices.get(request.voice)
    if config is None:
        raise HTTPException(status_code=404, detail=f"Voz nao encontrada: {request.voice}")

    try:
        result = engine.synthesize(
            config,
            request.text,
            speed=request.speed,
            mode=request.mode,
            nfe_step=request.nfe_step,
        )
    except Exception as exc:
        LOGGER.exception("Falha ao gerar TTS")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    headers = {
        "X-Generation-Time-Seconds": f"{result.generation_time_seconds:.3f}",
        "X-TTS-Device": result.device,
        "X-TTS-NFE-Step": str(result.nfe_step),
        "Cache-Control": "no-store",
    }
    return FileResponse(
        path=result.output_path,
        media_type="audio/wav",
        filename="supervoz.wav",
        headers=headers,
    )
