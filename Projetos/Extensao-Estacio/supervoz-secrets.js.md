# supervoz-secrets.js — Configuração Local da SuperVoz

**Última atualização:** 2026-06-15

## Responsabilidade

Define `globalThis.LEITOR_SUPERVOZ_DEFAULTS` antes de `popup.js` e `content.js`.

## Campos

- `apiToken`: token Bearer local usado pelo endpoint Modal quando preenchido.

## Motivo

O endpoint Modal retorna `HTTP 401` quando `API_AUTH_TOKEN` está ativo e o header `Authorization` está ausente ou incorreto. A extensão usa este arquivo para permitir configuração local do token sem colocar segredo real nos arquivos principais.

## Observação

O arquivo versionado mantém `apiToken` vazio para evitar bloqueio do GitHub Push Protection. Em uso local, quando o token é preenchido, `popup.js` e `content.js` normalizam o valor, removem prefixo `Bearer` duplicado e substituem token antigo salvo no Chrome quando a URL é o Modal padrão.
