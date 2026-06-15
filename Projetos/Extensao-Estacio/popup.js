// ============================================================
// Leitor Estácio — popup.js
// Script do popup que aparece ao clicar no ícone
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const openExtensionSettings = document.getElementById('openExtensionSettings');
  const openDocs = document.getElementById('openDocs');
  const ttsProvider = document.getElementById('ttsProvider');
  const supervozApiUrl = document.getElementById('supervozApiUrl');
  const hfToken = document.getElementById('hfToken');
  const supervozMode = document.getElementById('supervozMode');
  const supervozNfeStep = document.getElementById('supervozNfeStep');
  const supervozFallbackNative = document.getElementById('supervozFallbackNative');
  const supervozPrefetchEnabled = document.getElementById('supervozPrefetchEnabled');
  const saveSettings = document.getElementById('saveSettings');
  const testSupervoz = document.getElementById('testSupervoz');
  const settingsStatus = document.getElementById('settingsStatus');
  const diagBackendUrl = document.getElementById('diagBackendUrl');
  const diagToken = document.getElementById('diagToken');
  const diagProvider = document.getElementById('diagProvider');
  const diagEndpoint = document.getElementById('diagEndpoint');
  const diagHealth = document.getElementById('diagHealth');
  const diagLastError = document.getElementById('diagLastError');
  const DEFAULT_SUPERVOZ_API_URL = getDefaultSupervozUrl() || 'https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run';
  const HEALTH_TIMEOUT_MS = 20000;
  const LEGACY_SUPERVOZ_API_URLS = [
    'https://warllem-supervoz-f5-api.hf.space'
  ];
  const DEFAULT_SUPERVOZ_API_TOKEN = getDefaultSupervozToken();

  const DEFAULT_SETTINGS = {
    leitorTtsProvider: 'supervoz',
    leitorSupervozApiUrl: DEFAULT_SUPERVOZ_API_URL,
    leitorHfToken: DEFAULT_SUPERVOZ_API_TOKEN,
    leitorSupervozApiToken: DEFAULT_SUPERVOZ_API_TOKEN,
    leitorSupervozMode: 'balanced',
    leitorSupervozNfeStep: 32,
    leitorSupervozFallbackNative: false,
    leitorSupervozPrefetchEnabled: false
  };

  function setStatus(message, isError = false) {
    settingsStatus.textContent = message;
    settingsStatus.style.color = isError ? '#fc8181' : '#68d391';
  }

  chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
    const settings = normalizeSettings(items);
    chrome.storage.local.set(settings);
    ttsProvider.value = settings.leitorTtsProvider;
    supervozApiUrl.value = settings.leitorSupervozApiUrl;
    hfToken.value = settings.leitorHfToken;
    supervozMode.value = settings.leitorSupervozMode;
    supervozNfeStep.value = String(settings.leitorSupervozNfeStep);
    supervozFallbackNative.checked = settings.leitorSupervozFallbackNative === true;
    supervozPrefetchEnabled.checked = settings.leitorSupervozPrefetchEnabled === true;
    updateDiagnostics(settings);
  });

  // Abre a página de configurações (neste caso, abre INSTALAR.md)
  openExtensionSettings.addEventListener('click', () => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('INSTALAR.md')
    });
  });

  // Abre a documentação
  openDocs.addEventListener('click', () => {
    const url = 'https://github.com/warllemedicao/Extensao-Estacio';
    chrome.tabs.create({ url });
  });

  saveSettings.addEventListener('click', () => {
    const nfeStep = Math.max(4, Math.min(64, Number(supervozNfeStep.value) || 8));
    const settings = normalizeSettings({
      leitorTtsProvider: ttsProvider.value,
      leitorSupervozApiUrl: normalizeApiUrl(supervozApiUrl.value),
      leitorHfToken: hfToken.value,
      leitorSupervozApiToken: hfToken.value,
      leitorSupervozMode: supervozMode.value,
      leitorSupervozNfeStep: nfeStep,
      leitorSupervozFallbackNative: supervozFallbackNative.checked,
      leitorSupervozPrefetchEnabled: supervozPrefetchEnabled.checked
    });
    chrome.storage.local.set(settings, () => {
      supervozNfeStep.value = String(settings.leitorSupervozNfeStep);
      supervozApiUrl.value = settings.leitorSupervozApiUrl;
      hfToken.value = settings.leitorHfToken;
      supervozFallbackNative.checked = settings.leitorSupervozFallbackNative === true;
      supervozPrefetchEnabled.checked = settings.leitorSupervozPrefetchEnabled === true;
      updateDiagnostics(settings);
      setStatus('Configuração salva.');
    });
  });

  testSupervoz.addEventListener('click', async () => {
    const apiUrl = normalizeApiUrl(supervozApiUrl.value);
    const token = normalizeToken(hfToken.value, apiUrl);

    setStatus('Testando...');
    updateDiagnosticsFromForm({endpoint: '/health', health: 'testando', lastError: '-'});
    logRequest('/health', apiUrl, token);
    try {
      let response = await testarHealth(apiUrl, token);
      if (response.status === 401 && DEFAULT_SUPERVOZ_API_TOKEN && apiUrl === DEFAULT_SUPERVOZ_API_URL) {
        hfToken.value = DEFAULT_SUPERVOZ_API_TOKEN;
        chrome.storage.local.set({
          leitorHfToken: DEFAULT_SUPERVOZ_API_TOKEN,
          leitorSupervozApiToken: DEFAULT_SUPERVOZ_API_TOKEN
        });
        response = await testarHealth(apiUrl, DEFAULT_SUPERVOZ_API_TOKEN);
      }
      console.log('[Popup][SuperVoz]', {
        url: apiUrl,
        endpoint: '/health',
        status: response.status,
        token: maskToken(token || DEFAULT_SUPERVOZ_API_TOKEN)
      });
      if (!response.ok) {
        throw createHttpError(response.status);
      }
      const data = await response.json();
      setStatus(`OK: ${data.status}, ${data.device}, model_loaded=${data.model_loaded}`);
      updateDiagnosticsFromForm({
        endpoint: '/health',
        health: `${data.status}, ${data.device}, auth=${data.auth_enabled}`,
        lastError: '-'
      });
    } catch (error) {
      const message = friendlyError(error);
      setStatus(`Falha: ${message}`, true);
      updateDiagnosticsFromForm({
        endpoint: '/health',
        health: 'falhou',
        lastError: message
      });
    }
  });

  [ttsProvider, supervozApiUrl, hfToken, supervozMode, supervozNfeStep, supervozFallbackNative, supervozPrefetchEnabled].forEach((element) => {
    element.addEventListener('change', () => updateDiagnosticsFromForm());
    element.addEventListener('input', () => updateDiagnosticsFromForm());
  });

  function normalizeApiUrl(value) {
    const fallback = DEFAULT_SUPERVOZ_API_URL;
    const raw = cleanConfigValue(value || fallback) || fallback;
    let normalized = raw.replace(/\/+$/, '').replace(/\/(tts|health|voices)$/, '');
    if (LEGACY_SUPERVOZ_API_URLS.includes(normalized)) {
      normalized = DEFAULT_SUPERVOZ_API_URL;
    }
    return normalized;
  }

  function normalizeSettings(items) {
    const normalized = Object.assign({}, DEFAULT_SETTINGS, items || {});
    normalized.leitorSupervozApiUrl = normalizeApiUrl(normalized.leitorSupervozApiUrl);
    const configuredToken = normalized.leitorSupervozApiToken || normalized.leitorHfToken;
    const token = normalizeToken(configuredToken, normalized.leitorSupervozApiUrl);
    normalized.leitorHfToken = token;
    normalized.leitorSupervozApiToken = token;
    normalized.leitorTtsProvider = normalized.leitorTtsProvider || DEFAULT_SETTINGS.leitorTtsProvider;
    normalized.leitorSupervozMode = normalized.leitorSupervozMode || DEFAULT_SETTINGS.leitorSupervozMode;
    normalized.leitorSupervozNfeStep = Number(normalized.leitorSupervozNfeStep) || DEFAULT_SETTINGS.leitorSupervozNfeStep;
    normalized.leitorSupervozFallbackNative = normalized.leitorSupervozFallbackNative === true;
    normalized.leitorSupervozPrefetchEnabled = normalized.leitorSupervozPrefetchEnabled === true;
    return normalized;
  }

  function normalizeToken(value, apiUrl) {
    const token = cleanConfigValue(value).replace(/^Bearer\s+/i, '').trim();
    if (DEFAULT_SUPERVOZ_API_TOKEN && normalizeApiUrl(apiUrl) === DEFAULT_SUPERVOZ_API_URL) {
      return DEFAULT_SUPERVOZ_API_TOKEN;
    }
    return token;
  }

  function getDefaultSupervozToken() {
    const defaults = globalThis.LEITOR_SUPERVOZ_DEFAULTS || {};
    return cleanConfigValue(defaults.apiToken).replace(/^Bearer\s+/i, '').trim();
  }

  function getDefaultSupervozUrl() {
    const defaults = globalThis.LEITOR_SUPERVOZ_DEFAULTS || {};
    return cleanConfigValue(defaults.apiUrl);
  }

  function cleanConfigValue(value) {
    return String(value || '').trim().replace(/^['"]+|['"]+$/g, '').trim();
  }

  function testarHealth(apiUrl, token) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), HEALTH_TIMEOUT_MS);
    return fetch(`${apiUrl}/health`, {
      headers: buildAuthHeaders(token),
      signal: controller.signal
    }).finally(() => clearTimeout(timeoutId));
  }

  function buildAuthHeaders(token) {
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function createHttpError(status) {
    const error = new Error(`HTTP ${status}`);
    error.status = status;
    return error;
  }

  function friendlyError(error) {
    if (!error) return 'Erro desconhecido.';
    if (error.name === 'AbortError') return 'Timeout: Backend demorou para responder.';
    if (error.status === 401) return 'HTTP 401: Token inválido ou ausente. Verifique API_AUTH_TOKEN.';
    if (error.status === 404) return 'HTTP 404: Endpoint não encontrado. Verifique a rota da API.';
    if (/Failed to fetch/i.test(error.message || '')) return 'Failed to fetch: API offline, CORS ou URL incorreta.';
    if (error.status) return `HTTP ${error.status}: Falha no backend SuperVoz.`;
    return error.message || String(error);
  }

  function maskToken(token) {
    if (!token) return 'não';
    return `${token.slice(0, 4)}...${token.length}`;
  }

  function updateDiagnostics(settings) {
    const normalized = normalizeSettings(settings || {
      leitorTtsProvider: ttsProvider.value,
      leitorSupervozApiUrl: supervozApiUrl.value,
      leitorHfToken: hfToken.value,
      leitorSupervozApiToken: hfToken.value,
      leitorSupervozMode: supervozMode.value,
      leitorSupervozNfeStep: supervozNfeStep.value,
      leitorSupervozFallbackNative: supervozFallbackNative.checked,
      leitorSupervozPrefetchEnabled: supervozPrefetchEnabled.checked
    });
    diagBackendUrl.textContent = normalized.leitorSupervozApiUrl;
    diagToken.textContent = maskToken(normalized.leitorSupervozApiToken || normalized.leitorHfToken);
    diagProvider.textContent = normalized.leitorTtsProvider;
    diagEndpoint.textContent = diagEndpoint.textContent || '-';
  }

  function updateDiagnosticsFromForm(extra = {}) {
    updateDiagnostics();
    if (extra.endpoint !== undefined) diagEndpoint.textContent = extra.endpoint;
    if (extra.health !== undefined) diagHealth.textContent = extra.health;
    if (extra.lastError !== undefined) diagLastError.textContent = extra.lastError;
  }

  function logRequest(endpoint, apiUrl, token) {
    console.log('[Popup][SuperVoz]', {
      url: apiUrl,
      endpoint,
      status: 'iniciando',
      token: maskToken(token)
    });
  }

  console.log('[Popup] Leitor Estácio carregado');
});
