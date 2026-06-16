FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    OMP_NUM_THREADS=2 \
    ORT_NUM_THREADS=2 \
    SUPERVOZ_LITE_NFE_STEP=4 \
    SUPERVOZ_CACHE_DIR=/app/cache \
    SUPERVOZ_OUTPUT_DIR=/tmp/supervoz-outputs \
    HF_HOME=/app/cache/huggingface \
    XDG_CACHE_HOME=/app/cache

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY app.py lite_engine.py voice_manager.py voices.json ./
RUN mkdir -p /app/cache /tmp/supervoz-outputs

EXPOSE 8080

CMD ["sh", "-c", "uvicorn app:app --host 0.0.0.0 --port ${PORT:-8080}"]
