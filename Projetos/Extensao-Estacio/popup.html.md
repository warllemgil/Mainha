# popup.html — Interface de Popup

**Última atualização:** 2026-06-15

## Alteração 2026-06-15

- Adicionado seletor visual de processamento com `Modo Ultra (GPU)` e `Modo Lite (CPU)`.
- O popup agora exibe campos separados para `URL Ultra (GPU)` e `URL Lite (CPU)`.
- O painel de diagnóstico exibe também o modo selecionado.
- Texto de ajuda atualizado para explicar que o Lite usa Cloud Run e NFE entre `10` e `16`.
- Status visual atualizado para `v1.4.2`.
- `supervoz-secrets.js` é carregado antes de `popup.js`.
- Campo de token indica que a API pode vir configurada localmente.
- Texto de ajuda deixa claro que o popup é opcional para trocar endpoint/modo/token.
- Adicionado modo de diagnóstico no popup: URL, token mascarado, motor, endpoint, resultado de `/health` e último erro.
- Adicionado checkbox para permitir fallback para voz nativa apenas quando o usuário quiser.
- Adicionado checkbox para pré-geração de próximo bloco, desligado por padrão para reduzir custo no Modal.

## Estrutura
- Título: "Leitor Estácio"
- Instruções básicas
- Botões: "Configurações" e "Ajuda"
- Painel "Motor de voz"
- Seletor `Modo Ultra (GPU)` / `Modo Lite (CPU)`
- Campo `HF_TOKEN`
- Campo `URL Ultra (GPU)`
- Campo `URL Lite (CPU)`
- Seletor `Nativa do navegador` / `SuperVoz F5`
- Seletor de modo `fast`, `balanced`, `quality`
- Campo `NFE`
- Botões "Salvar voz" e "Testar conexão"

## Status
✅ Funcional
✅ Configura SuperVoz sem hardcodar token no código
✅ Permite trocar o endpoint para Modal GPU sem editar código
⚠️ O token fica no `chrome.storage.local`, adequado para uso pessoal/local

## Próximas Melhorias
- [x] Seletor de motor de voz
- [ ] Velocidade de leitura
- [ ] Toggle de velocidade automática
- [ ] Status em tempo real (lendo/pausado)
