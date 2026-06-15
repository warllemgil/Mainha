const fs = require('fs');
const path = require('path');

const extensionDir = path.resolve(__dirname, '..');
const outputPath = path.join(extensionDir, 'supervoz-secrets.js');

const apiUrl = cleanValue(process.env.MAINHA_BACKEND_URL || '');
const liteApiUrl = cleanValue(process.env.MAINHA_LITE_BACKEND_URL || process.env.MAINHA_CLOUD_RUN_URL || '');
const apiToken = cleanValue(process.env.MAINHA_ASSISTANT_TOKEN || process.env.API_AUTH_TOKEN || '');

function jsString(value) {
  return JSON.stringify(cleanValue(value).replace(/^Bearer\s+/i, '').trim());
}

function cleanValue(value) {
  return String(value || '').trim().replace(/^['"]+|['"]+$/g, '').trim();
}

const contents = `// Gerado por scripts/build-supervoz-secrets.js.
// Nao commite tokens reais.
globalThis.LEITOR_SUPERVOZ_DEFAULTS = {
  apiUrl: ${jsString(apiUrl)},
  liteApiUrl: ${jsString(liteApiUrl)},
  apiToken: ${jsString(apiToken)}
};
`;

fs.writeFileSync(outputPath, contents, 'utf8');
console.log(`supervoz-secrets.js gerado. apiUrl=${apiUrl ? 'sim' : 'nao'} liteApiUrl=${liteApiUrl ? 'sim' : 'nao'} apiToken=${apiToken ? 'sim' : 'nao'}`);
