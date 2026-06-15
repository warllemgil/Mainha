# SuperVoz F5 Lite CPU

API alternativa para rodar F5-TTS em CPU no Google Cloud Run usando ONNX Runtime (`CPUExecutionProvider`). Ela mantém o mesmo contrato da API GPU:

- `GET /health`
- `GET /voices`
- `POST /tts`

O Modo Lite limita `nfe_step` para a faixa `10..16`; o padrão é `12`, configurável por `SUPERVOZ_LITE_NFE_STEP`.

## Converter o modelo para ONNX

Crie um ambiente separado para conversão:

```bash
cd /workspaces/Mainha/SuperVoz-F5-Lite
python3 -m venv .venv-convert
. .venv-convert/bin/activate
pip install -r requirements-convert.txt
```

Baixe ou aponte para uma cópia local do checkpoint e do vocab:

```bash
python scripts/convert_f5_to_onnx.py \
  --checkpoint /caminho/para/model_2000.pt \
  --vocab /caminho/para/vocab.txt \
  --output model_lite_cpu.onnx
```

Valide o contrato do ONNX:

```bash
python - <<'PY'
import onnxruntime as ort
s = ort.InferenceSession("model_lite_cpu.onnx", providers=["CPUExecutionProvider"])
print("inputs:", [(i.name, i.shape, i.type) for i in s.get_inputs()])
print("outputs:", [(o.name, o.shape, o.type) for o in s.get_outputs()])
print("providers:", s.get_providers())
PY
```

Depois envie `model_lite_cpu.onnx` para o mesmo bucket/repo configurado em `voices.json`, no caminho:

```text
voices/v_minha_voz_f5_tts_ptbr/model/model_lite_cpu.onnx
```

## Teste local

```bash
cd /workspaces/Mainha/SuperVoz-F5-Lite
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
API_AUTH_TOKEN="SEU_TOKEN" uvicorn app:app --host 0.0.0.0 --port 8080
```

```bash
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:8080/health
```

## Deploy no Google Cloud Run

```bash
gcloud auth login
gcloud config set project SEU_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com

gcloud run deploy supervoz-f5-lite \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --cpu 2 \
  --memory 2Gi \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 1 \
  --timeout 300 \
  --set-env-vars API_AUTH_TOKEN=SEU_TOKEN,SUPERVOZ_LITE_NFE_STEP=12,ORT_NUM_THREADS=2
```

Copie a URL retornada pelo deploy e configure a extensão como `Modo Lite (CPU)`.
