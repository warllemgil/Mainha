# Historico de alteracoes: voice_manager.py

## 2026-06-12

Versao inicial do gerenciador de vozes.

- Adicionado carregamento de configuracoes a partir de `voices.json`.
- Adicionadas estruturas `VoiceConfig` e `ResolvedVoice`.
- Adicionado download de artefatos pelo `huggingface_hub`.
- Adicionado suporte a `HF_TOKEN` para repositorios que exigirem autenticacao.
- Adicionado diagnostico de arquivos reais no Hugging Face.
- Adicionada busca tolerante por arquivos de referencia em `data_reference/` e `reference/`.

## Como atualizar este arquivo

Sempre que `voice_manager.py` mudar, adicione uma nova entrada no topo com:

- data da alteracao;
- motivo da alteracao;
- campos de voz afetados;
- impacto no download/localizacao de arquivos;
- como foi testado.
