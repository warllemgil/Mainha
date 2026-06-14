from pathlib import Path

import modal


APP_NAME = "supervoz-f5-gpu"
PROJECT_DIR = "/root/supervoz"
CACHE_DIR = "/cache"
GPU_TYPE = "T4"

LOCAL_DIR = Path(__file__).resolve().parent

image = (
    modal.Image.from_registry(
        "nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04",
        add_python="3.11",
    )
    .apt_install("ffmpeg", "git", "libsndfile1")
    .run_commands(
        "pip install --upgrade pip",
        "pip install torch torchaudio --index-url https://download.pytorch.org/whl/cu124",
    )
    .pip_install_from_requirements(str(LOCAL_DIR / "requirements-modal.txt"))
    .add_local_dir(str(LOCAL_DIR), remote_path=PROJECT_DIR, copy=True)
    .env(
        {
            "SUPERVOZ_CACHE_DIR": CACHE_DIR,
            "SUPERVOZ_OUTPUT_DIR": f"{CACHE_DIR}/outputs",
            "SUPERVOZ_LOG_DIR": f"{CACHE_DIR}/logs",
            "SUPERVOZ_PRELOAD_ON_STARTUP": "false",
            "SUPERVOZ_STARTUP_DIAGNOSTIC": "false",
        }
    )
)

app = modal.App(APP_NAME, image=image)
cache_volume = modal.Volume.from_name("supervoz-f5-cache", create_if_missing=True)
secrets = [modal.Secret.from_name("supervoz-f5-secrets")]


@app.function(
    gpu=GPU_TYPE,
    timeout=900,
    scaledown_window=60,
    volumes={CACHE_DIR: cache_volume},
    secrets=secrets,
)
@modal.concurrent(max_inputs=1)
@modal.asgi_app()
def fastapi_app():
    import sys

    sys.path.insert(0, PROJECT_DIR)
    from app import app as web_app

    return web_app
