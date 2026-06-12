# Historico de alteracoes: f5_engine.py

## 2026-06-12

Versao inicial do engine F5-TTS.

- Adicionada classe `F5Engine`.
- Adicionado cache em memoria para manter a voz carregada uma vez.
- Adicionada selecao automatica de `cuda` quando disponivel, caso contrario `cpu`.
- Adicionada geracao de WAV em `outputs/`.
- Adicionado modo economico com `nfe_step` menor.
- Adicionado retorno estruturado em `TTSResult`.

## Como atualizar este arquivo

Sempre que `f5_engine.py` mudar, adicione uma nova entrada no topo com:

- data da alteracao;
- motivo da alteracao;
- funcoes/classes afetadas;
- impacto em CPU/CUDA, memoria ou tempo de geracao;
- como foi testado.
