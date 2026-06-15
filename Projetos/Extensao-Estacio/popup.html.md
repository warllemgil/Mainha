# popup.html — Interface de Popup

**Última atualização:** 2026-06-15

## Alteração 2026-06-15

- Status visual atualizado para `v1.4.1`.
- `supervoz-secrets.js` é carregado antes de `popup.js`.
- Campo de token indica que a API pode vir configurada localmente.
- Texto de ajuda deixa claro que o popup é opcional para trocar endpoint/modo/token.

## Estrutura
- Título: "Leitor Estácio"
- Instruções básicas
- Botões: "Configurações" e "Ajuda"
- Painel "Motor de voz"
- Campo `HF_TOKEN`
- Campo `URL da API SuperVoz`
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
