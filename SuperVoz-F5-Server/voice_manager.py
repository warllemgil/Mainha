import json
import logging
import os
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from huggingface_hub import HfApi, hf_hub_download


LOGGER = logging.getLogger("supervoz.voice_manager")
PROJECT_ROOT = Path(__file__).resolve().parent
VOICES_FILE = PROJECT_ROOT / "voices.json"


class VoiceConfigError(RuntimeError):
    pass


@dataclass(frozen=True)
class VoiceConfig:
    voice_id: str
    name: str
    hf_repo: str
    voice_path: str
    model_file: str
    vocab_file: str
    ref_audio: str
    ref_text: str
    language: str = "pt-BR"
    speed: float = 1.0


@dataclass(frozen=True)
class ResolvedVoice:
    config: VoiceConfig
    base_dir: Path
    model_path: Path
    vocab_path: Path
    ref_audio_path: Path
    ref_text_path: Path
    ref_text: str


def load_voices(config_path: Path = VOICES_FILE) -> dict[str, VoiceConfig]:
    if not config_path.exists():
        raise VoiceConfigError(f"Arquivo de vozes nao encontrado: {config_path}")

    with config_path.open("r", encoding="utf-8") as file:
        raw = json.load(file)

    voices: dict[str, VoiceConfig] = {}
    for voice_id, data in raw.items():
        try:
            voices[voice_id] = VoiceConfig(voice_id=voice_id, **data)
        except TypeError as exc:
            raise VoiceConfigError(f"Voz invalida em voices.json: {voice_id}") from exc
    return voices


def public_voice_info(config: VoiceConfig) -> dict[str, Any]:
    return {
        "id": config.voice_id,
        "name": config.name,
        "hf_repo": config.hf_repo,
        "voice_path": config.voice_path,
        "language": config.language,
        "speed": config.speed,
    }


def diagnose_hf_repo(repo_id: str, voice_path: str) -> dict[str, Any]:
    token = os.getenv("HF_TOKEN")
    try:
        files = HfApi(token=token).list_repo_files(repo_id=repo_id, repo_type="model")
    except Exception as exc:
        LOGGER.warning("Nao foi possivel listar %s no Hugging Face: %s", repo_id, exc)
        return {
            "repo_id": repo_id,
            "voice_path": voice_path,
            "ok": False,
            "error": str(exc),
            "hint": "Se o repo exigir autenticacao, defina HF_TOKEN antes de iniciar o servidor.",
        }

    prefix = f"{voice_path.rstrip('/')}/"
    voice_files = sorted(path for path in files if path.startswith(prefix))
    model_files = [path for path in voice_files if "/model/" in path]
    reference_files = [
        path
        for path in voice_files
        if "/reference/" in path or "/data_reference/" in path
    ]
    return {
        "repo_id": repo_id,
        "voice_path": voice_path,
        "ok": True,
        "total_files": len(files),
        "voice_files": voice_files,
        "model_files": model_files,
        "reference_files": reference_files,
    }


def resolve_voice(config: VoiceConfig) -> ResolvedVoice:
    base_dir = PROJECT_ROOT / config.voice_path
    base_dir.mkdir(parents=True, exist_ok=True)

    model_path = _resolve_artifact(config, config.model_file)
    vocab_path = _resolve_artifact(config, config.vocab_file)
    ref_audio_path = _resolve_reference_artifact(config, config.ref_audio, audio=True)
    ref_text_path = _resolve_reference_artifact(config, config.ref_text, audio=False)
    ref_text = _read_reference_text(ref_text_path)

    return ResolvedVoice(
        config=config,
        base_dir=base_dir,
        model_path=model_path,
        vocab_path=vocab_path,
        ref_audio_path=ref_audio_path,
        ref_text_path=ref_text_path,
        ref_text=ref_text,
    )


def _resolve_artifact(config: VoiceConfig, relative_file: str) -> Path:
    local_path = PROJECT_ROOT / config.voice_path / relative_file
    if local_path.exists():
        LOGGER.info("Usando arquivo local: %s", local_path)
        return local_path

    return _download_artifact(config, relative_file)


def _resolve_reference_artifact(
    config: VoiceConfig, relative_file: str, *, audio: bool
) -> Path:
    candidates = [relative_file]
    if relative_file.startswith("reference/"):
        candidates.append(relative_file.replace("reference/", "data_reference/", 1))
    if relative_file.startswith("data_reference/"):
        candidates.append(relative_file.replace("data_reference/", "reference/", 1))

    if audio:
        candidates.extend(
            [
                "data_reference/ref.wav",
                "data_reference/reference.wav",
                "reference/ref.wav",
                "reference/reference.wav",
            ]
        )
    else:
        candidates.extend(
            [
                "data_reference/ref.txt",
                "data_reference/reference.txt",
                "reference/ref.txt",
                "reference/reference.txt",
            ]
        )

    seen: set[str] = set()
    errors: list[str] = []
    for candidate in candidates:
        if candidate in seen:
            continue
        seen.add(candidate)
        local_path = PROJECT_ROOT / config.voice_path / candidate
        if local_path.exists():
            LOGGER.info("Usando referencia local: %s", local_path)
            return local_path
        try:
            return _download_artifact(config, candidate)
        except Exception as exc:
            errors.append(f"{candidate}: {exc}")

    discovered = _discover_reference_file(config, audio=audio)
    if discovered:
        try:
            return _download_artifact(config, discovered)
        except Exception as exc:
            errors.append(f"{discovered}: {exc}")

    kind = "audio de referencia" if audio else "texto de referencia"
    raise VoiceConfigError(
        f"Nao foi possivel localizar o {kind} da voz {config.voice_id}. "
        + "Tentativas: "
        + " | ".join(errors)
    )


def _discover_reference_file(config: VoiceConfig, *, audio: bool) -> str | None:
    token = os.getenv("HF_TOKEN")
    try:
        files = HfApi(token=token).list_repo_files(
            repo_id=config.hf_repo, repo_type="model"
        )
    except Exception as exc:
        LOGGER.warning("Nao foi possivel procurar referencia no HF: %s", exc)
        return None

    prefix = f"{config.voice_path.rstrip('/')}/"
    extensions = (".wav", ".mp3", ".flac", ".ogg", ".m4a") if audio else (".txt",)
    matches = []
    for path in files:
        if not path.startswith(prefix):
            continue
        relative = path[len(prefix) :]
        if not (
            relative.startswith("data_reference/")
            or relative.startswith("reference/")
        ):
            continue
        if relative.lower().endswith(extensions):
            matches.append(relative)

    if not matches:
        return None

    matches.sort(key=lambda item: (0 if "ref" in Path(item).stem.lower() else 1, item))
    LOGGER.info("Referencia descoberta no Hugging Face: %s", matches[0])
    return matches[0]


def _download_artifact(config: VoiceConfig, relative_file: str) -> Path:
    repo_file = f"{config.voice_path.rstrip('/')}/{relative_file}"
    local_dir = PROJECT_ROOT / config.voice_path / Path(relative_file).parent
    local_dir.mkdir(parents=True, exist_ok=True)

    LOGGER.info("Baixando %s de %s", repo_file, config.hf_repo)
    token = os.getenv("HF_TOKEN")
    downloaded = hf_hub_download(
        repo_id=config.hf_repo,
        repo_type="model",
        filename=repo_file,
        local_dir=PROJECT_ROOT,
        local_dir_use_symlinks=False,
        token=token,
    )
    return Path(downloaded)


def _read_reference_text(path: Path) -> str:
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise VoiceConfigError(f"Texto de referencia vazio: {path}")
    return text
