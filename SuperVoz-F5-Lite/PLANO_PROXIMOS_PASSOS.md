# SuperVoz F5 Lite — Plano de Finalizacao

**Atualizado em:** 2026-06-15

Este documento registra onde o processo parou e qual deve ser o passo a passo para finalizar o Modo Lite CPU no Google Cloud Run.

## Estado atual

Ja foi entregue no repositorio:

- Backend Lite em `SuperVoz-F5-Lite/`.
- API FastAPI compativel com a API GPU atual:
  - `GET /health`
  - `GET /voices`
  - `POST /tts`
- Runtime Lite preparado para `onnxruntime` com `CPUExecutionProvider`.
- Limite de `nfe_step` entre `10` e `16`, com padrao `12`.
- Dockerfile para Google Cloud Run.
- Script experimental de conversao para ONNX em `scripts/convert_f5_to_onnx.py`.
- Extensao com selecao entre:
  - `Modo Ultra (GPU)`
  - `Modo Lite (CPU)`
- Campo separado para URL Lite/Cloud Run.
- Documentacao principal em `README.md`.

## O que ainda falta

No ambiente atual ainda nao existem:

- Checkpoint treinado local (`.pt` ou `.safetensors`).
- `vocab.txt` local.
- `model_lite_cpu.onnx`.
- Google Cloud CLI (`gcloud`) instalado/configurado neste workspace.
- URL final do Cloud Run.
- `liteApiUrl` configurada em `supervoz-secrets.js`.

Portanto, o Modo Lite esta estruturado no codigo, mas ainda nao esta operacional em producao.

## Conteudo necessario

Para continuar, precisamos ter acesso a:

1. Checkpoint treinado do F5-TTS:

```text
model_2000.pt
```

ou:

```text
model_last.pt
base_checkpoint.safetensors
```

2. Vocabulario usado no treino:

```text
vocab.txt
```

3. Token da API:

```text
API_AUTH_TOKEN
```

Pode ser o mesmo token usado no Modo Ultra/GPU ou um token novo para o Cloud Run.

4. Projeto Google Cloud:

```text
PROJECT_ID
REGION
```

Regiao sugerida:

```text
us-central1
```

5. Destino do artefato ONNX.

Padrao esperado pelo `voices.json`:

```text
voices/v_minha_voz_f5_tts_ptbr/model/model_lite_cpu.onnx
```

## Passo 1 — Colocar os arquivos do modelo no workspace

Criar uma pasta local temporaria:

```bash
mkdir -p /workspaces/Mainha/_local_models/supervoz
```

Colocar nela:

```text
/workspaces/Mainha/_local_models/supervoz/model_2000.pt
/workspaces/Mainha/_local_models/supervoz/vocab.txt
```

Esses arquivos nao devem ser commitados.

## Passo 2 — Converter para ONNX

Entrar no projeto Lite:

```bash
cd /workspaces/Mainha/SuperVoz-F5-Lite
```

Criar ambiente de conversao:

```bash
python3 -m venv .venv-convert
. .venv-convert/bin/activate
pip install -r requirements-convert.txt
```

Rodar conversao:

```bash
python scripts/convert_f5_to_onnx.py \
  --checkpoint /workspaces/Mainha/_local_models/supervoz/model_2000.pt \
  --vocab /workspaces/Mainha/_local_models/supervoz/vocab.txt \
  --output /workspaces/Mainha/_local_models/supervoz/model_lite_cpu.onnx
```

## Passo 3 — Validar o ONNX

Ainda no ambiente de conversao:

```bash
python - <<'PY'
import onnxruntime as ort

model = "/workspaces/Mainha/_local_models/supervoz/model_lite_cpu.onnx"
s = ort.InferenceSession(model, providers=["CPUExecutionProvider"])

print("providers:", s.get_providers())
print("inputs:")
for i in s.get_inputs():
    print(" ", i.name, i.shape, i.type)

print("outputs:")
for o in s.get_outputs():
    print(" ", o.name, o.shape, o.type)
PY
```

O contrato esperado pelo `lite_engine.py` aceita entradas com nomes como:

```text
text_ids
text_lengths
ref_text_ids
ref_text_lengths
speed
n_steps
```

Se o grafo ONNX sair com nomes diferentes, o arquivo `lite_engine.py` deve ser ajustado para mapear as entradas reais.

## Passo 4 — Enviar o ONNX para o reposititorio/bucket da voz

O backend Lite busca o arquivo definido em `SuperVoz-F5-Lite/voices.json`:

```json
"onnx_model_file": "model/model_lite_cpu.onnx"
```

Com `voice_path`:

```text
voices/v_minha_voz_f5_tts_ptbr
```

Logo, o caminho remoto esperado e:

```text
voices/v_minha_voz_f5_tts_ptbr/model/model_lite_cpu.onnx
```

Enviar o arquivo para esse caminho no mesmo bucket/repo configurado:

```text
warllem/Voz_Noslen
```

## Passo 5 — Testar API Lite localmente

Instalar dependencias da API:

```bash
cd /workspaces/Mainha/SuperVoz-F5-Lite
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
```

Rodar servidor local:

```bash
API_AUTH_TOKEN="SEU_TOKEN" \
SUPERVOZ_LITE_NFE_STEP=12 \
uvicorn app:app --host 0.0.0.0 --port 8080
```

Testar:

```bash
curl -H "Authorization: Bearer SEU_TOKEN" http://localhost:8080/health
```

Teste TTS:

```bash
curl -L \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST http://localhost:8080/tts \
  -d '{"voice":"warllem","text":"Teste do modo lite em CPU.","speed":1.0,"mode":"lite","nfe_step":12}' \
  --output /tmp/supervoz_lite_test.wav
```

## Passo 6 — Preparar Google Cloud

No terminal com Google Cloud CLI instalado:

```bash
gcloud auth login
gcloud config set project SEU_PROJECT_ID
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

Confirmar projeto:

```bash
gcloud config list
```

## Passo 7 — Deploy no Cloud Run

Entrar na pasta:

```bash
cd /workspaces/Mainha/SuperVoz-F5-Lite
```

Fazer deploy:

```bash
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

Guardar a URL retornada, por exemplo:

```text
https://supervoz-f5-lite-xxxxx-uc.a.run.app
```

## Passo 8 — Testar Cloud Run

```bash
curl -H "Authorization: Bearer SEU_TOKEN" \
  https://supervoz-f5-lite-xxxxx-uc.a.run.app/health
```

Teste TTS:

```bash
curl -L \
  -H "Authorization: Bearer SEU_TOKEN" \
  -H "Content-Type: application/json" \
  -X POST https://supervoz-f5-lite-xxxxx-uc.a.run.app/tts \
  -d '{"voice":"warllem","text":"Teste do modo lite no Cloud Run.","speed":1.0,"mode":"lite","nfe_step":12}' \
  --output /tmp/supervoz_lite_cloudrun.wav
```

## Passo 9 — Configurar extensao

Gerar `supervoz-secrets.js` local:

```bash
cd /workspaces/Mainha/Projetos/Extensao-Estacio

MAINHA_BACKEND_URL="https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run" \
MAINHA_LITE_BACKEND_URL="https://supervoz-f5-lite-xxxxx-uc.a.run.app" \
MAINHA_ASSISTANT_TOKEN="SEU_TOKEN" \
node scripts/build-supervoz-secrets.js
```

Ou preencher manualmente no popup:

- Processamento: `Modo Lite (CPU)`
- URL Lite: URL do Cloud Run
- Token: `SEU_TOKEN`
- NFE: entre `10` e `16`

## Passo 10 — Validar na extensao

1. Recarregar a extensao em `chrome://extensions`.
2. Abrir o popup.
3. Selecionar `Modo Lite (CPU)`.
4. Clicar em `Testar conexao`.
5. Abrir uma pagina de leitura.
6. Iniciar leitura com `SuperVoz F5`.
7. Verificar no console:

```text
[SuperVoz] mode: lite
```

## Riscos conhecidos

- A conversao ONNX do F5-TTS e experimental.
- Se o grafo exportado nao tiver entradas compativeis, sera necessario ajustar `lite_engine.py`.
- CPU serverless pode ser mais lento que GPU; por isso o Lite usa textos menores por chunk e `nfe_step` baixo.
- Cloud Run com `min-instances=0` pode ter cold start.
- Se o modelo ONNX ficar muito grande, o download no cold start pode impactar a primeira chamada.

## Criterio de pronto

O Modo Lite sera considerado finalizado quando:

- `model_lite_cpu.onnx` existir no destino remoto.
- `/health` do Cloud Run responder `status=ok`.
- `/tts` do Cloud Run gerar WAV valido.
- A extensao alternar entre Ultra e Lite sem mudar codigo.
- `Modo Ultra (GPU)` continuar funcionando com a API Modal atual.
- `Modo Lite (CPU)` funcionar com a URL Cloud Run.
