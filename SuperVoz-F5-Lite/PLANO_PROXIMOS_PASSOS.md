# SuperVoz F5 Lite — Plano de Finalizacao

**Atualizado em:** 2026-06-16

Este documento registra onde o processo parou e qual deve ser o passo a passo para finalizar o Modo Lite CPU no Google Cloud Run.

## Estado atual

Ja foi entregue no repositorio:

- Backend Lite em `SuperVoz-F5-Lite/`.
- API FastAPI compativel com a API GPU atual:
  - `GET /health`
  - `GET /voices`
  - `POST /tts`
- Runtime Lite preparado para `onnxruntime` com `CPUExecutionProvider`.
- Limite de `nfe_step` entre `4` e `16`, com padrao `4`.
- Dockerfile para Google Cloud Run.
- Script experimental de conversao para ONNX em `scripts/convert_f5_to_onnx.py`.
- Extensao com selecao entre:
  - `Modo Ultra (GPU)`
  - `Modo Lite (CPU)`
- Campo separado para URL Lite/Cloud Run.
- Documentacao principal em `README.md`.

Deploy Cloud Run executado em 2026-06-16:

- Projeto: `mainha-supervoz`.
- Regiao: `us-central1`.
- Servico: `supervoz-f5-lite`.
- URL: `https://supervoz-f5-lite-798667988901.us-central1.run.app`.
- Revisao pronta: `supervoz-f5-lite-00002-tkb`.
- `/health` respondeu `200` com `runtime=f5-tts-python-cpu+onnxruntime-core`.
- `/voices` respondeu `200`.
- `/tts` ainda nao concluiu: testes com `nfe_step=10` e `nfe_step=4` ficaram sem resposta ate timeout do cliente.

Verificado em 2026-06-16 no bucket Hugging Face `warllem/Voz_Noslen`:

- Bucket existe, publico, com `repoType=bucket`.
- `voices/v_minha_voz_f5_tts_ptbr/model/model_2000.pt` existe.
- `voices/v_minha_voz_f5_tts_ptbr/model/model_last.pt` existe.
- `voices/v_minha_voz_f5_tts_ptbr/model/base_checkpoint.safetensors` existe.
- `voices/v_minha_voz_f5_tts_ptbr/model/vocab.txt` existe.
- `voices/v_minha_voz_f5_tts_ptbr/data_reference/referencia_voz.wav` existe.

Verificado em 2026-06-16 no repositorio Hugging Face `warllem/Voz_Noslen_ONNX`:

- Pacote ONNX: `onnx_packages/voz_noslen_f5tts_onnx_20260616_022201`.
- Arquivo ONNX: `onnx/f5_tts_transformer_core.onnx` existe e tem `675496412` bytes.
- O ONNX foi testado localmente com `onnxruntime` em CPU e executou com sucesso.
- Entradas reais do ONNX: `x`, `cond`, `text`, `time`, `mask`.
- Saida real do ONNX: `pred`.
- O pacote declara `full_text_to_audio_onnx=false`: este ONNX cobre apenas o nucleo Transformer/DiT, nao um grafo completo texto-para-WAV.
- Para gerar WAV, o pacote exige runtime F5-TTS Python + Vocos usando `model/model_2000.pt`, `model/vocab.txt` e `reference/referencia_voz.wav`.

## O que ainda falta

No ambiente atual ainda nao existem:

- `liteApiUrl` configurada em `supervoz-secrets.js`.
- Permissao `Logs Viewer` para a service account `codex-deploy@mainha-supervoz.iam.gserviceaccount.com`, necessaria para diagnosticar o timeout do `/tts`.

Observacao: o ONNX ja existe no repo `warllem/Voz_Noslen_ONNX`, mas ele nao e um modelo completo `text/text_ids -> audio`. O backend Lite foi ajustado para tratar esse arquivo como ONNX core validavel e usar F5-TTS Python em CPU para a geracao de WAV.

Portanto, o Modo Lite esta deployado e responde `/health`, mas ainda nao esta aprovado em producao porque `/tts` nao gerou WAV no Cloud Run.

## Conteudo necessario

Para continuar, precisamos ter acesso a:

1. Checkpoint treinado do F5-TTS ja disponivel no bucket:

```text
model_2000.pt
```

ou:

```text
model_last.pt
base_checkpoint.safetensors
```

2. Vocabulario usado no treino ja disponivel no bucket:

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

Padrao atual esperado pelo `voices.json`:

```text
onnx_packages/voz_noslen_f5tts_onnx_20260616_022201/onnx/f5_tts_transformer_core.onnx
```

## Passo 1 — Usar o pacote ONNX pronto

O `voices.json` do backend Lite ja aponta para:

```text
hf_repo: warllem/Voz_Noslen_ONNX
repo_type: model
voice_path: onnx_packages/voz_noslen_f5tts_onnx_20260616_022201
model_file: model/model_2000.pt
vocab_file: model/vocab.txt
ref_audio: reference/referencia_voz.wav
onnx_model_file: onnx/f5_tts_transformer_core.onnx
```

Esses arquivos serao baixados sob demanda pelo backend para `SUPERVOZ_CACHE_DIR` ou para `SuperVoz-F5-Lite/cache`.

## Passo 2 — Validar o ONNX core

Validacao executada localmente em 2026-06-16:

```text
providers: CPUExecutionProvider
inputs: x, cond, text, time, mask
output: pred
run_elapsed_seconds: ~0.87
```

O backend tambem roda essa validacao no carregamento da voz.

## Passo 3 — Testar API Lite localmente

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
SUPERVOZ_LITE_NFE_STEP=4 \
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
  -d '{"voice":"warllem","text":"Teste do modo lite em CPU.","speed":1.0,"mode":"lite","nfe_step":4}' \
  --output /tmp/supervoz_lite_test.wav
```

## Passo 4 — Preparar Google Cloud

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

## Passo 5 — Deploy no Cloud Run

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
  --cpu 4 \
  --memory 12Gi \
  --concurrency 1 \
  --min-instances 0 \
  --max-instances 1 \
  --timeout 900 \
  --set-env-vars API_AUTH_TOKEN=SEU_TOKEN,SUPERVOZ_LITE_NFE_STEP=4,ORT_NUM_THREADS=2
```

Guardar a URL retornada, por exemplo:

```text
https://supervoz-f5-lite-xxxxx-uc.a.run.app
```

## Passo 6 — Testar Cloud Run

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
  -d '{"voice":"warllem","text":"Teste do modo lite no Cloud Run.","speed":1.0,"mode":"lite","nfe_step":4}' \
  --output /tmp/supervoz_lite_cloudrun.wav
```

## Passo 7 — Configurar extensao

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
- NFE: entre `4` e `16`

## Passo 8 — Validar na extensao

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

- O ONNX disponivel e apenas o nucleo Transformer/DiT, nao o pipeline completo texto-para-WAV.
- O backend Lite precisa baixar e carregar `model_2000.pt` alem do ONNX core.
- CPU serverless pode ser mais lento que GPU; por isso o Lite usa textos menores por chunk e `nfe_step` baixo.
- Cloud Run com `min-instances=0` pode ter cold start.
- O download inicial do checkpoint e do ONNX pode impactar a primeira chamada.

## Criterio de pronto

O Modo Lite sera considerado finalizado quando:

- `onnx/f5_tts_transformer_core.onnx` existir no pacote `warllem/Voz_Noslen_ONNX`.
- `/health` do Cloud Run responder `status=ok`.
- `/tts` do Cloud Run gerar WAV valido.
- A extensao alternar entre Ultra e Lite sem mudar codigo.
- `Modo Ultra (GPU)` continuar funcionando com a API Modal atual.
- `Modo Lite (CPU)` funcionar com a URL Cloud Run.
