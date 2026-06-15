# manifest.json — Configuração da Extensão

**Última atualização:** 2026-06-15

## Versão
`"version": "1.4.2"`

## Alteração 2026-06-15 v1.4.2

- Versão atualizada para `1.4.2`.
- `content_scripts.js` continua carregando `supervoz-secrets.js` antes de `content.js`.
- A correção de auth usa o header `Authorization: Bearer <API_AUTH_TOKEN>`, confirmado pelo backend FastAPI.

## Alteração 2026-06-15

- Versão atualizada para `1.4.1`.
- `supervoz-secrets.js` é carregado antes de `content.js`, permitindo token local sem publicar segredo no commit.
- O ajuste de token corrige `HTTP 401` causado por token antigo/incorreto salvo no armazenamento local do Chrome.

## Host Permissions (Sites onde a extensão ativa)
- `http://*/*`
- `https://*/*`
- `*.estacio.br`
- `*.estacioprd.net`
- `stecine.azureedge.net`
- `*.ensineme.com.br`
- `warllem-supervoz-f5-api.hf.space`
- `*.modal.run`

## Permissions Usadas
- `activeTab` — para acessar aba ativa
- `scripting` — para injetar scripts
- `storage` — salvar preferências
- `offscreen` — criar áudio offscreen (backup)

## Content Scripts
```javascript
{
  "matches": ["http://*/*", "https://*/*"],
  "all_frames": true,  // ← Crucial para iframes
  "run_at": "document_idle"
}
```

## Alteração 2026-06-14 — Páginas gerais

- Versão atualizada para `1.4.0`.
- Descrição alterada para leitura de páginas web em geral.
- Adicionados `http://*/*` e `https://*/*` em `host_permissions`.
- Adicionados `http://*/*` e `https://*/*` em `content_scripts.matches`.
- A extensão agora injeta o player em páginas HTTP/HTTPS comuns, mantendo suporte específico aos domínios Estácio/Stecine/EnsineMe e às APIs SuperVoz/Modal.
- Limitações permanecem: `chrome://`, Chrome Web Store, PDFs sem texto selecionável, canvas/imagem e páginas com bloqueios especiais do navegador.

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
