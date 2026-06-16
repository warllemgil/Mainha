# SuperVoz F5 Lite CPU

API alternativa para rodar F5-TTS em CPU no Google Cloud Run usando o pacote ONNX/Lite `warllem/Voz_Noslen_ONNX`. Ela mantém o mesmo contrato da API GPU:

- `GET /health`
- `GET /voices`
- `POST /tts`

O Modo Lite limita `nfe_step` para a faixa `4..16`; o padrão é `4`, configurável por `SUPERVOZ_LITE_NFE_STEP`.

## Pacote ONNX verificado

O pacote usado agora é:

```text
warllem/Voz_Noslen_ONNX
onnx_packages/voz_noslen_f5tts_onnx_20260616_022201
```

Arquivos necessários:

```text
model/model_2000.pt
model/vocab.txt
reference/referencia_voz.wav
onnx/f5_tts_transformer_core.onnx
```

O arquivo `onnx/f5_tts_transformer_core.onnx` foi verificado com `onnxruntime` em CPU. Ele tem entradas `x`, `cond`, `text`, `time`, `mask` e saída `pred`.

Importante: esse ONNX é apenas o núcleo Transformer/DiT do F5-TTS. Ele não é um grafo completo texto-para-WAV. Por isso o backend Lite usa F5-TTS Python + Vocos para gerar o WAV e mantém o ONNX Runtime para validar/carregar o núcleo exportado.

## Converter o modelo para ONNX

Este passo só é necessário se for gerar um novo pacote ONNX. O pacote atual já existe em `warllem/Voz_Noslen_ONNX`.

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
  --output onnx/f5_tts_transformer_core.onnx
```

Valide o contrato do ONNX core gerado:

```bash
python - <<'PY'
import onnxruntime as ort
s = ort.InferenceSession("onnx/f5_tts_transformer_core.onnx", providers=["CPUExecutionProvider"])
print("inputs:", [(i.name, i.shape, i.type) for i in s.get_inputs()])
print("outputs:", [(o.name, o.shape, o.type) for o in s.get_outputs()])
print("providers:", s.get_providers())
PY
```

Se o objetivo for um backend Lite completo sem F5-TTS Python, sera necessario exportar outro grafo ONNX que cubra todo o pipeline texto-para-WAV. O pacote atual nao faz isso.

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
  --cpu 4 \
  --memory 12Gi \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 1 \
  --timeout 900 \
  --set-env-vars API_AUTH_TOKEN=SEU_TOKEN,SUPERVOZ_LITE_NFE_STEP=4,ORT_NUM_THREADS=2
```

Copie a URL retornada pelo deploy e configure a extensão como `Modo Lite (CPU)`.
