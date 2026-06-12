# Historico de alteracoes: requirements.txt

## 2026-06-12

Versao inicial das dependencias.

- Adicionado `fastapi` para API local.
- Adicionado `uvicorn[standard]` para rodar o servidor.
- Adicionado `huggingface_hub` para baixar arquivos da voz.
- Adicionado `hf_xet` para suporte a arquivos grandes armazenados via Xet no Hugging Face.
- Adicionado `pydantic` para validar payloads.
- Adicionados `torch` e `torchaudio` para execucao do modelo.
- Adicionado `soundfile` para escrita/leitura de audio.
- Adicionado `f5-tts` como runtime oficial do F5-TTS.

## Como atualizar este arquivo

Sempre que `requirements.txt` mudar, adicione uma nova entrada no topo com:

- data da alteracao;
- pacote adicionado, removido ou fixado;
- motivo da mudanca;
- impacto esperado na instalacao;
- como foi testado.
