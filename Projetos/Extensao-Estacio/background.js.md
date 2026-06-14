# background.js — Service Worker de Fundo

**Última atualização:** 2026-06-14
**Linhas:** ~21

## Responsabilidades Principais

### `onInstalled`
- Log de instalação
- Registra instalação ou atualização
- A mensagem de update foi ajustada para `v1.4.0`

### `onMessage`
- Placeholder para futuro: `getVoices`
- Comunicação com content.js

## Status
✅ Mínimo e funcional
⚠️ Sem lógica complexa; a integração SuperVoz fica em `content.js` e `popup.js`

## Notas
- Manifest v3 exige service worker em vez de background page
- Não reinjetar scripts (manifest já faz isso automaticamente)
