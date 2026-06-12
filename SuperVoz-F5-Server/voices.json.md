# Historico de alteracoes: voices.json

## 2026-06-12

Versao inicial do cadastro de vozes.

- Adicionada voz `warllem`.
- Configurado repo `warllem/Super_voz`.
- Configurada pasta `voices/v_minha_voz_f5_tts_ptbr`.
- Configurado checkpoint `model/model_2000.pt`.
- Configurado vocabulario `model/vocab.txt`.
- Configurados caminhos iniciais de referencia em `data_reference/ref.wav` e `data_reference/ref.txt`.
- Configurado idioma `pt-BR` e velocidade `1.0`.

## Como atualizar este arquivo

Sempre que `voices.json` mudar, adicione uma nova entrada no topo com:

- data da alteracao;
- voz adicionada, removida ou alterada;
- checkpoint usado;
- paths de referencia usados;
- motivo da mudanca.
