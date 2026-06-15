import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests


LOGGER = logging.getLogger("supervoz_lite.voice_manager")
PROJECT_ROOT = Path(__file__).resolve().parent
CACHE_DIR = Path(os.getenv("SUPERVOZ_CACHE_DIR", PROJECT_ROOT / "cache"))
VOICES_FILE = PROJECT_ROOT / "voices.json"


class VoiceConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class VoiceConfig:
    voice_id: str
    name: str
    hf_source: str
    hf_repo: str
    repo_type: str
    voice_path: str
    model_file: str
    onnx_model_file: str
    vocab_file: str
    ref_audio: str
    ref_text: str
    language: str = "pt-BR"
    speed: float = 1.0
    default_mode: str = "lite"


@dataclass(frozen=True)
class ResolvedVoice:
    config: VoiceConfig
    onnx_model_path: Path
    vocab_path: Path
    ref_audio_path: Path
    ref_text: str


def load_voices(config_path: Path = VOICES_FILE) -> dict[str, VoiceConfig]:
    with config_path.open("r", encoding="utf-8") as file:
        raw = json.load(file)

    voices: dict[str, VoiceConfig] = {}
    for voice_id, data in raw.items():
        try:
            voices[voice_id] = VoiceConfig(voice_id=voice_id, **data)
        except TypeError as exc:
            raise VoiceConfigError(f"Voz invalida em voices.json: {voice_id}: {exc}") from exc
    return voices


def public_voice_info(config: VoiceConfig) -> dict[str, Any]:
    return {
        "id": config.voice_id,
        "name": config.name,
        "language": config.language,
        "runtime": "onnxruntime-cpu",
    }


def resolve_voice(config: VoiceConfig) -> ResolvedVoice:
    onnx_model_path = resolve_artifact(config, config.onnx_model_file)
    vocab_path = resolve_artifact(config, config.vocab_file)
    ref_audio_path = resolve_artifact(config, config.ref_audio)
    ref_text = resolve_ref_text(config)

    for path in (onnx_model_path, vocab_path, ref_audio_path):
        if not path.is_file() or path.stat().st_size <= 0:
            raise VoiceConfigError(f"Artefato invalido ou vazio: {path}")

    return ResolvedVoice(
        config=config,
        onnx_model_path=onnx_model_path,
        vocab_path=vocab_path,
        ref_audio_path=ref_audio_path,
        ref_text=ref_text,
    )


def resolve_ref_text(config: VoiceConfig) -> str:
    value = (config.ref_text or "").strip()
    if not value:
        return ""

    if len(value) < 260 and not any(sep in value for sep in ("\n", "\r")):
        candidate = local_artifact_path(config, value)
        if candidate.exists():
            return candidate.read_text(encoding="utf-8", errors="ignore").strip()
        try:
            downloaded = resolve_artifact(config, value)
            return downloaded.read_text(encoding="utf-8", errors="ignore").strip()
        except Exception:
            LOGGER.info("ref_text tratado como texto literal, nao como arquivo: %s", value)

    return value


def resolve_artifact(config: VoiceConfig, relative_file: str) -> Path:
    local_path = local_artifact_path(config, relative_file)
    if local_path.exists() and local_path.stat().st_size > 0:
        LOGGER.info("Usando cache local: %s", local_path)
        return local_path

    if config.repo_type == "bucket":
        return download_bucket_file(config, relative_file, local_path)

    return download_hub_file(config, relative_file)


def local_artifact_path(config: VoiceConfig, relative_file: str) -> Path:
    return CACHE_DIR / config.hf_repo.replace("/", "__") / config.voice_path / relative_file


def remote_path(config: VoiceConfig, relative_file: str) -> str:
    return f"{config.voice_path.rstrip('/')}/{relative_file.lstrip('/')}"


def download_bucket_file(config: VoiceConfig, relative_file: str, local_path: Path) -> Path:
    local_path.parent.mkdir(parents=True, exist_ok=True)
    encoded = quote(remote_path(config, relative_file), safe="/")
    url = f"{config.hf_source.rstrip('/')}/resolve/{encoded}"
    headers = {}
    token = os.getenv("HF_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"

    LOGGER.info("Baixando bucket HF: %s", remote_path(config, relative_file))
    with requests.get(url, headers=headers, stream=True, timeout=(30, 600)) as response:
        response.raise_for_status()
        tmp_path = local_path.with_suffix(local_path.suffix + ".download")
        with tmp_path.open("wb") as file:
            for chunk in response.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    file.write(chunk)
        tmp_path.replace(local_path)

    LOGGER.info("Arquivo baixado: %s (%s bytes)", local_path, local_path.stat().st_size)
    return local_path


def download_hub_file(config: VoiceConfig, relative_file: str) -> Path:
    from huggingface_hub import hf_hub_download

    token = os.getenv("HF_TOKEN")
    path = hf_hub_download(
        repo_id=config.hf_repo,
        repo_type=config.repo_type,
        filename=remote_path(config, relative_file),
        local_dir=CACHE_DIR,
        token=token,
    )
    return Path(path)
