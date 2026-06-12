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
