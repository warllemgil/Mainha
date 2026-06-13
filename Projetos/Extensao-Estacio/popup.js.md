# popup.js — Script do Popup

**Última atualização:** 2026-06-12

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
GET https://warllem-supervoz-f5-api.hf.space/health
```

Ou `GET {leitorSupervozApiUrl}/health`, quando a URL for trocada para Modal GPU.

## Segurança

O `HF_TOKEN` não fica salvo no código. Ele é digitado no popup e persistido localmente no navegador via `chrome.storage.local`.
