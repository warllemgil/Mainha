# popup.js — Script do Popup

**Última atualização:** 2026-06-15

## Alteração 2026-06-15

- v1.4.2: o botão `Testar conexão` usa timeout, mensagens específicas por status HTTP e diagnóstico visível no popup.
- O endpoint testado é `GET /health`, via função centralizada `supervozRequest('/health')`, com headers `Authorization: Bearer <API_AUTH_TOKEN>` e `X-API-Token`.
- Tokens são salvos em `leitorSupervozApiToken` e também em `leitorHfToken` para compatibilidade com versões antigas.
- URL e token passam por limpeza de aspas simples/duplas extras para evitar `Failed to fetch` por `modal.run"`.
- O fallback para voz nativa virou opção explícita em `leitorSupervozFallbackNative`.
- A pré-geração virou opção explícita em `leitorSupervozPrefetchEnabled`, padrão `false`.
- SuperVoz F5 virou o motor padrão.
- URL Modal fica preenchida automaticamente.
- Token padrão local é lido de `globalThis.LEITOR_SUPERVOZ_DEFAULTS.apiToken`, definido por `supervoz-secrets.js`.
- A URL antiga `https://warllem-supervoz-f5-api.hf.space`, que atualmente responde `404`, é migrada automaticamente para o endpoint Modal.
- O teste de conexão usa o token padrão quando o campo está vazio.
- Correção do `HTTP 401`: tokens salvos anteriormente no Chrome agora são normalizados. Se a URL for o Modal padrão e houver token local em `supervoz-secrets.js`, a extensão força esse token; se o usuário colar `Bearer ...`, o prefixo duplicado é removido antes de montar o header.

## Alteração 2026-06-14

- URL padrão da API SuperVoz: `https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run`.
- Modo padrão: `balanced`.
- `nfe_step` padrão: `32`.
- O popup mantém compatibilidade com URLs customizadas e token Bearer salvo em `chrome.storage.local`.

## Responsabilidade

Controla a tela que abre ao clicar no ícone da extensão.

## Funções atuais

- Abre a documentação de instalação.
- Abre o repositório no GitHub.
- Carrega configurações salvas em `chrome.storage.local`.
- Salva:
  - `leitorTtsProvider`
  - `leitorSupervozApiUrl`
- `leitorHfToken`
  - `leitorSupervozApiToken`
  - `leitorSupervozMode`
  - `leitorSupervozNfeStep`
  - `leitorSupervozFallbackNative`
  - `leitorSupervozPrefetchEnabled`
- Testa o endpoint:

```text
GET https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run/health
```

Ou `GET {leitorSupervozApiUrl}/health`, quando a URL for trocada manualmente.

## Token embutido

Para uso pessoal/local, o token da API Modal pode ficar em `supervoz-secrets.js` e também é persistido em `chrome.storage.local`. O arquivo versionado não contém token real para permitir push no GitHub.
