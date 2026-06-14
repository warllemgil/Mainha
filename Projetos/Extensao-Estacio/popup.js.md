# popup.js — Script do Popup

**Última atualização:** 2026-06-14

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
  - `leitorSupervozMode`
  - `leitorSupervozNfeStep`
- Testa o endpoint:

```text
GET https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run/health
```

Ou `GET {leitorSupervozApiUrl}/health`, quando a URL for trocada manualmente.

## Segurança

O `HF_TOKEN` não fica salvo no código. Ele é digitado no popup e persistido localmente no navegador via `chrome.storage.local`.
