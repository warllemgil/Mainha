# background.js — Service Worker de Fundo

**Última atualização:** 2026-05-19
**Linhas:** 46

## Responsabilidades Principais

### `onInstalled`
- Log de instalação
- Abre `popup.html`

### `onMessage`
- Placeholder para futuro: `getVoices`
- Comunicação com content.js

## Status
✅ Mínimo e funcional
⚠️ Sem lógica complexa (mantém como est)

## Notas
- Manifest v3 exige service worker em vez de background page
- Não reinjetar scripts (manifest já faz isso automaticamente)
