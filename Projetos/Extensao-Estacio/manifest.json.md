# manifest.json — Configuração da Extensão

**Última atualização:** 2026-06-12

## Versão
`"version": "1.3.0"`

## Host Permissions (Sites onde a extensão ativa)
- `*.estacio.br`
- `*.estacioprd.net`
- `stecine.azureedge.net`
- `*.ensineme.com.br`
- `warllem-supervoz-f5-api.hf.space`

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

## Alteração 2026-06-13 — Modal GPU

Adicionada permissão:

```json
"https://*.modal.run/*"
```

Motivo: permitir que a extensão chame o endpoint SuperVoz F5 hospedado no Modal GPU quando a URL for configurada no popup.
- ✅ Manifest injeta em `all_frames`
- ✅ `content.js` detecta `window !== window.top`
- ❌ **Não conseguimos acessar DOM do iframe externo** (Azure)
- 🔄 Solução: Usar `postMessage` + injetar script iframe alternativo

## Alteração 2026-06-12

- Versão atualizada para `1.3.0`.
- Adicionada `host_permission` para `https://warllem-supervoz-f5-api.hf.space/*`.
- Essa permissão permite que `content.js` e `popup.js` chamem `/tts` e `/health` da API SuperVoz F5.
