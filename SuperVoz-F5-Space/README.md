---
title: SuperVoz F5 API
emoji: 🔊
colorFrom: blue
colorTo: green
sdk: docker
app_port: 7860
pinned: false
---

# SuperVoz F5 API

API FastAPI para rodar F5-TTS em Hugging Face Spaces com Docker.

## Space

- Owner: `warllem`
- Space: `supervoz-f5-api`
- SDK: Docker
- Porta: `7860`
- URL esperada: `https://warllem-supervoz-f5-api.hf.space`

## Modal GPU atual

- App: `supervoz-f5-gpu`
- URL atual: `https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run`
- GPU: `T4`
- `SUPERVOZ_PRELOAD_ON_STARTUP=false`
- `SUPERVOZ_STARTUP_DIAGNOSTIC=false`
- `scaledown_window=60`
- Dependência Modal fixada em `f5-tts==1.1.9`, alinhada ao fluxo testado no Kaggle.
- O servidor normaliza o WAV quando o pico passa do limite configurado, reduzindo risco de clipping/voz estourada.

## Voz configurada

Bucket diagnosticado: `https://huggingface.co/buckets/warllem/Voz_Noslen`

O bucket e publico, tem `28` arquivos e cerca de `21.75 GB`. A voz limpa para inferencia esta em:

`voices/v_minha_voz_f5_tts_ptbr`

Arquivos relevantes:

- `voices/v_minha_voz_f5_tts_ptbr/manifest.json`
- `voices/v_minha_voz_f5_tts_ptbr/model/model_2000.pt`
- `voices/v_minha_voz_f5_tts_ptbr/model/latest_checkpoint.pt`
- `voices/v_minha_voz_f5_tts_ptbr/model/model_last.pt`
- `voices/v_minha_voz_f5_tts_ptbr/model/base_checkpoint.safetensors`
- `voices/v_minha_voz_f5_tts_ptbr/model/vocab.txt`
- `voices/v_minha_voz_f5_tts_ptbr/data_reference/referencia_voz.wav`
- `voices/v_minha_voz_f5_tts_ptbr/docs/duration.json`

O checkpoint escolhido e `model/model_2000.pt`, porque o `manifest.json` aponta `voice_checkpoint` para esse arquivo. O `vocab.txt` fica em `model/vocab.txt`. O audio de referencia fica em `data_reference/referencia_voz.wav`.

Nao existe `.txt` de referencia publicado nessa pasta; o servidor envia `ref_text=""` para o F5-TTS tentar preprocessar/transcrever a referencia. A pasta `voices/minha_voz_f5_tts_ptbr` parece duplicada e contem arquivos `.tmp`, entao nao foi escolhida.

## HF_TOKEN

O token nunca deve ser salvo no repositorio. No Space, configure em:

`Settings -> Variables and secrets -> New secret -> HF_TOKEN`

Como o bucket atual esta publico, o download deve funcionar sem token, mas manter `HF_TOKEN` configurado ajuda se algum arquivo mudar para privado ou se a API exigir autenticacao.

## Endpoints

### GET /health

```bash
curl https://warllem-supervoz-f5-api.hf.space/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "device": "cpu",
  "model_loaded": true,
  "space": "running"
}
```

### GET /voices

```bash
curl https://warllem-supervoz-f5-api.hf.space/voices
```

### POST /tts

Retorna audio direto (`Content-Type: audio/wav`):

```bash
curl -X POST "https://warllem-supervoz-f5-api.hf.space/tts" \
  -H "Content-Type: application/json" \
  -d '{"voice":"warllem","text":"Boa noite Warllem, sua voz está pronta.","speed":1.0,"mode":"balanced"}' \
  --output teste.wav
```

JavaScript:

```js
const response = await fetch("https://warllem-supervoz-f5-api.hf.space/tts", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    voice: "warllem",
    text: "Boa noite Warllem, sua voz está pronta.",
    speed: 1.0,
    mode: "balanced"
  })
});

const blob = await response.blob();
const url = URL.createObjectURL(blob);
const audio = new Audio(url);
audio.play();
```

## Modos

- `fast`: menor `nfe_step`, menor latencia.
- `balanced`: equilibrio.
- `quality`: maior `nfe_step`, mais lento.

Tambem e possivel sobrescrever `nfe_step` no JSON.

## Observacao de CPU Basic

CPU Basic deve funcionar para validar a API, mas F5-TTS em CPU pode ser lento, especialmente no primeiro boot, porque baixa checkpoint grande, carrega modelo e pode baixar/carregar vocoder. Para uso real com extensao, o proximo passo recomendado e trocar o hardware do Space para uma GPU NVIDIA pequena.

## Plano de migracao para GPU

O plano documentado para sair do CPU Basic esta em:

`MIGRACAO_MODAL_GPU.md`

Implementacao inicial adicionada em 2026-06-13:

- `modal_app.py`: app Modal ASGI com GPU `T4`, volume persistente `supervoz-f5-cache` e secret `supervoz-f5-secrets`.
- `requirements-modal.txt`: dependencias do container Modal sem reinstalar `torch` CPU por cima do PyTorch CUDA.
- `app.py`: aceita `API_AUTH_TOKEN` opcional via Bearer token e usa diretorios configuraveis para log/cache/output.
- Extensao Estacio: popup agora aceita `URL da API SuperVoz`, permitindo trocar do Space para o endpoint Modal sem editar codigo.
- Economia de credito: no Modal, `SUPERVOZ_PRELOAD_ON_STARTUP=false`, `SUPERVOZ_STARTUP_DIAGNOSTIC=false` e `scaledown_window=60`. O modelo so e carregado em `POST /tts`, nao no boot nem em `/health`.
- Qualidade/continuidade em 2026-06-14: extensão usa `balanced`, `nfe_step=32`, prefetch sequencial de até 3 blocos e backend com normalização de pico.

Comandos esperados apos autenticar o CLI do Modal:

```bash
cd SuperVoz-F5-Space
modal secret create supervoz-f5-secrets HF_TOKEN=SEU_HF_TOKEN API_AUTH_TOKEN=SEU_TOKEN_DA_API
modal deploy modal_app.py
```

Depois do deploy, copie a URL `https://...modal.run`, abra o popup da extensao, cole em `URL da API SuperVoz`, informe o mesmo `API_AUTH_TOKEN`, salve e teste a conexao.

Observacao: clicar em `Testar conexao` chama `/health` e pode acordar o container por alguns segundos, mas nao carrega o modelo. Para nao acordar o Modal antes da leitura, apenas salve a URL/token e clique Play na aula.

Observacao de custo: durante uma leitura ativa, a extensao pode gerar ate 3 blocos seguintes em sequencia. Ela nao dispara inferencias paralelas, mas pode gerar audio que o usuario talvez nao ouca se parar logo em seguida. O Stop e a troca de pagina abortam o prefetch local.

Resumo:

- Manter este Hugging Face Space como referencia funcional atual.
- Migrar a inferencia para Modal Starter usando credito mensal gratuito de compute, se disponivel na conta.
- Comecar com GPU pequena, preferencialmente `T4` ou `L4`, para validar custo, latencia e qualidade.
- Depois apontar a extensao para o novo endpoint Modal ou usar o Space como proxy.

Observacao tecnica: chiados/estouros nao sao necessariamente causados apenas por CPU. Tambem podem vir de referencia de audio, preprocessamento do `ref_text`, vocoder, checkpoint, parametros `nfe_step/speed` ou clipping no WAV. A GPU e recomendada principalmente para reduzir latencia e permitir testes de qualidade com mais folga.
