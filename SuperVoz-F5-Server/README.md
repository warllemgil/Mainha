# SuperVoz-F5-Server

Servidor local em Python para carregar uma voz F5-TTS do Hugging Face e gerar audio WAV via API.

## Diagnostico inicial da voz

Repositorio configurado: `warllem/Super_voz`

Pasta ativa da voz: `voices/v_minha_voz_f5_tts_ptbr`

Arquivos confirmados pela pagina do Hugging Face:

- `voices/v_minha_voz_f5_tts_ptbr/manifest.json`
- `voices/v_minha_voz_f5_tts_ptbr/model/base_checkpoint.safetensors`
- `voices/v_minha_voz_f5_tts_ptbr/model/latest_checkpoint.pt`
- `voices/v_minha_voz_f5_tts_ptbr/model/model_2000.pt`
- `voices/v_minha_voz_f5_tts_ptbr/model/model_last.pt`
- `voices/v_minha_voz_f5_tts_ptbr/model/vocab.txt`
- `voices/v_minha_voz_f5_tts_ptbr/data_reference/`
- `voices/v_minha_voz_f5_tts_ptbr/docs/`

O `manifest.json` da voz aponta:

- `architecture`: `F5-TTS`
- `exp_name`: `F5TTS_v1_Base`
- `tokenizer`: `char`
- `primary_language`: `pt-BR`
- `voice_checkpoint`: `model/model_2000.pt`
- `latest_checkpoint`: `model/latest_checkpoint.pt`

Checkpoint correto para esta primeira versao: `model/model_2000.pt`.

Observacao: se o Hugging Face exigir autenticacao para download, defina `HF_TOKEN` antes de iniciar o servidor.

## Instalar

Recomendado usar Python 3.10 ou superior.

```bash
cd SuperVoz-F5-Server
python -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

Para GPU NVIDIA, instale antes um `torch`/`torchaudio` compativel com sua CUDA conforme a documentacao oficial do PyTorch. Depois rode `pip install -r requirements.txt`.

## Rodar

```bash
cd SuperVoz-F5-Server
source .venv/bin/activate
uvicorn server:app --host 127.0.0.1 --port 8000
```

Na primeira execucao o servidor baixa os arquivos configurados da voz e carrega o modelo. O checkpoint tem varios GB, entao isso pode demorar.

## Endpoints

### GET /health

```bash
curl http://127.0.0.1:8000/health
```

### GET /voices

```bash
curl http://127.0.0.1:8000/voices
```

### POST /tts

```bash
curl -X POST http://127.0.0.1:8000/tts \
  -H "Content-Type: application/json" \
  -d '{"voice_id":"warllem","text":"Boa noite Warllem, sua voz está pronta.","economy":true}'
```

Resposta esperada:

```json
{
  "voice_id": "warllem",
  "audio_path": "outputs/warllem_1710000000000.wav",
  "audio_abs_path": "/caminho/para/SuperVoz-F5-Server/outputs/warllem_1710000000000.wav",
  "generation_time_seconds": 12.345,
  "device": "cpu",
  "nfe_step": 12,
  "speed": 1.0
}
```

## Configurar vozes

Edite `voices.json` para cadastrar outras vozes:

```json
{
  "warllem": {
    "name": "Voz do Warllem",
    "hf_repo": "warllem/Super_voz",
    "voice_path": "voices/v_minha_voz_f5_tts_ptbr",
    "model_file": "model/model_2000.pt",
    "vocab_file": "model/vocab.txt",
    "ref_audio": "data_reference/ref.wav",
    "ref_text": "data_reference/ref.txt",
    "language": "pt-BR",
    "speed": 1.0
  }
}
```

O servidor tambem tenta alternativas comuns para referencia, como `reference/ref.wav` e `reference/ref.txt`, se os caminhos configurados ainda nao existirem localmente.

## CPU e CUDA

O servidor usa CPU por padrao quando CUDA nao esta disponivel. Se `torch.cuda.is_available()` retornar `true`, ele usa CUDA automaticamente.

Modo economico:

- CPU: `nfe_step=12`
- CUDA: `nfe_step=16`

Modo normal:

- CPU: `nfe_step=16`
- CUDA: `nfe_step=32`

Voce pode sobrescrever `nfe_step` no corpo do `POST /tts`.
