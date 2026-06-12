# Historico de alteracoes: server.py

## 2026-06-12

Versao inicial do servidor FastAPI.

- Criados endpoints `GET /health`, `GET /voices` e `POST /tts`.
- Adicionado carregamento de `voices.json` na inicializacao.
- Adicionado diagnostico simples do repositorio Hugging Face no startup.
- Adicionado preload da voz para carregar o modelo uma vez.
- Adicionado log em console e em `logs/server.log`.
- `POST /tts` retorna caminho do WAV, tempo de geracao, device, `nfe_step` e `speed`.

## Como atualizar este arquivo

Sempre que `server.py` mudar, adicione uma nova entrada no topo com:

- data da alteracao;
- motivo da alteracao;
- arquivos ou endpoints afetados;
- impacto esperado;
- como foi testado.
