import logging
import os
from pathlib import Path

from fastapi import Depends, FastAPI, Header, HTTPException, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from lite_engine import F5LiteEngine, MAX_LITE_NFE_STEP, MIN_LITE_NFE_STEP
from voice_manager import load_voices, public_voice_info


PROJECT_ROOT = Path(__file__).resolve().parent
LOG_DIR = Path(os.getenv("SUPERVOZ_LOG_DIR", PROJECT_ROOT / "cache" / "logs"))
LOG_DIR.mkdir(parents=True, exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s - %(message)s",
    handlers=[logging.StreamHandler()],
)
LOGGER = logging.getLogger("supervoz_lite.app")

app = FastAPI(title="SuperVoz F5 Lite API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

voices = load_voices()
engine = F5LiteEngine()
auth_scheme = HTTPBearer(auto_error=False)


class TTSRequest(BaseModel):
    voice: str = "warllem"
    text: str = Field(..., min_length=1)
    speed: float | None = Field(default=None, gt=0.2, le=2.5)
    mode: str = Field(default="lite", pattern="^(lite|fast|balanced|quality)$")
    nfe_step: int | None = Field(default=None, ge=MIN_LITE_NFE_STEP, le=MAX_LITE_NFE_STEP)


def require_api_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(auth_scheme),
    x_api_token: str | None = Header(default=None, alias="X-API-Token"),
    x_api_key: str | None = Header(default=None, alias="x-api-key"),
) -> None:
    expected_token = clean_token(os.getenv("API_AUTH_TOKEN", ""))
    if not expected_token or request.method == "OPTIONS":
        return

    token = extract_request_token(request, credentials, x_api_token, x_api_key)
    if token != expected_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de API invalido.",
            headers={"WWW-Authenticate": "Bearer"},
        )


def clean_token(value: str | None) -> str:
    token = (value or "").strip()
    if token.lower().startswith("bearer "):
        token = token[7:].strip()
    return token.strip().strip("'\"")


def extract_request_token(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None,
    x_api_token: str | None,
    x_api_key: str | None,
) -> str:
    if credentials and credentials.credentials:
        return clean_token(credentials.credentials)

    authorization = request.headers.get("authorization", "")
    if authorization:
        return clean_token(authorization)

    return clean_token(x_api_token or x_api_key or "")


def env_flag(name: str, *, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on", "sim"}


@app.on_event("startup")
def startup() -> None:
    LOGGER.info("Iniciando SuperVoz F5 Lite com %s voz(es)", len(voices))
    if env_flag("SUPERVOZ_PRELOAD_ON_STARTUP", default=False):
        try:
            engine.preload(voices)
        except Exception:
            LOGGER.exception("Falha no preload. O /tts tentara carregar sob demanda.")


@app.get("/health", dependencies=[Depends(require_api_token)])
def health() -> dict:
    return {
        "status": "ok",
        "device": engine.device,
        "runtime": "onnxruntime",
        "provider": engine.execution_provider,
        "model_loaded": engine.model_loaded,
        "mode": "lite",
        "auth_enabled": bool(os.getenv("API_AUTH_TOKEN", "").strip()),
        "nfe_step_range": [MIN_LITE_NFE_STEP, MAX_LITE_NFE_STEP],
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
        LOGGER.exception("Falha ao gerar TTS Lite")
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    headers = {
        "X-Generation-Time-Seconds": f"{result.generation_time_seconds:.3f}",
        "X-TTS-Device": result.device,
        "X-TTS-Runtime": "onnxruntime",
        "X-TTS-NFE-Step": str(result.nfe_step),
        "Cache-Control": "no-store",
    }
    return FileResponse(
        path=result.output_path,
        media_type="audio/wav",
        filename="supervoz-lite.wav",
        headers=headers,
    )
