# scripts/build-supervoz-secrets.js — Gerador de Secrets da Extensão

**Última atualização:** 2026-06-15

## Responsabilidade

Gera `supervoz-secrets.js` a partir de variáveis de ambiente sem expor token nos arquivos principais da extensão.

## Variáveis

- `MAINHA_BACKEND_URL`: URL base do backend SuperVoz, por exemplo `https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run`.
- `MAINHA_ASSISTANT_TOKEN`: token usado como `API_AUTH_TOKEN` no backend Modal.
- `API_AUTH_TOKEN`: fallback aceito caso `MAINHA_ASSISTANT_TOKEN` não esteja definido.

## Uso

```bash
cd Projetos/Extensao-Estacio
MAINHA_BACKEND_URL="https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run" \
MAINHA_ASSISTANT_TOKEN="SEU_API_AUTH_TOKEN" \
node scripts/build-supervoz-secrets.js
```

## Observação

O script remove prefixo `Bearer` e aspas extras se forem passados por engano, gravando URL/token limpos em `supervoz-secrets.js`.
