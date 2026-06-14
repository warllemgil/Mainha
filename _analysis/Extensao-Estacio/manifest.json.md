# manifest.json — Configuração da Extensão

**Última atualização:** 2026-05-19

## Versão
`"version": "1.2.4"`

## Host Permissions (Sites onde a extensão ativa)
- `*.estacio.br`
- `*.estacioprd.net`
- `stecine.azureedge.net`

## Permissions Usadas
- `activeTab` — para acessar aba ativa
- `scripting` — para injetar scripts
- `storage` — salvar preferências
- `offscreen` — criar áudio offscreen (backup)

## Content Scripts
```javascript
{
  "matches": ["*.estacio.br", "*.estacioprd.net"],
  "all_frames": true,  // ← Crucial para iframes
  "run_at": "document_idle"
}
```

## Status de Iframes Cross-Origin
- ✅ Manifest injeta em `all_frames`
- ✅ `content.js` detecta `window !== window.top`
- ❌ **Não conseguimos acessar DOM do iframe externo** (Azure)
- 🔄 Solução: Usar `postMessage` + injetar script iframe alternativo
