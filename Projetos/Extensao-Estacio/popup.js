// ============================================================
// Leitor Estácio — popup.js
// Script do popup que aparece ao clicar no ícone
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const openExtensionSettings = document.getElementById('openExtensionSettings');
  const openDocs = document.getElementById('openDocs');
  const ttsProvider = document.getElementById('ttsProvider');
  const supervozProcessingMode = document.getElementById('supervozProcessingMode');
  const supervozApiUrl = document.getElementById('supervozApiUrl');
  const supervozLiteApiUrl = document.getElementById('supervozLiteApiUrl');
  const hfToken = document.getElementById('hfToken');
  const supervozMode = document.getElementById('supervozMode');
  const supervozNfeStep = document.getElementById('supervozNfeStep');
  const supervozFallbackNative = document.getElementById('supervozFallbackNative');
  const supervozPrefetchEnabled = document.getElementById('supervozPrefetchEnabled');
  const saveSettings = document.getElementById('saveSettings');
  const testSupervoz = document.getElementById('testSupervoz');
  const settingsStatus = document.getElementById('settingsStatus');
  const diagBackendUrl = document.getElementById('diagBackendUrl');
  const diagProcessingMode = document.getElementById('diagProcessingMode');
  const diagToken = document.getElementById('diagToken');
  const diagProvider = document.getElementById('diagProvider');
  const diagEndpoint = document.getElementById('diagEndpoint');
  const diagHealth = document.getElementById('diagHealth');
  const diagLastError = document.getElementById('diagLastError');
  const DEFAULT_SUPERVOZ_API_URL = getDefaultSupervozUrl() || 'https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run';
  const DEFAULT_SUPERVOZ_LITE_API_URL = getDefaultSupervozLiteUrl();
  const HEALTH_TIMEOUT_MS = 20000;
  const LEGACY_SUPERVOZ_API_URLS = [
    'https://warllem-supervoz-f5-api.hf.space'
  ];
  const DEFAULT_SUPERVOZ_API_TOKEN = getDefaultSupervozToken();

  const DEFAULT_SETTINGS = {
    leitorTtsProvider: 'supervoz',
    leitorSupervozProcessingMode: 'ultra',
    leitorSupervozApiUrl: DEFAULT_SUPERVOZ_API_URL,
    leitorSupervozLiteApiUrl: DEFAULT_SUPERVOZ_LITE_API_URL,
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
    supervozProcessingMode.value = settings.leitorSupervozProcessingMode;
    supervozApiUrl.value = settings.leitorSupervozApiUrl;
    supervozLiteApiUrl.value = settings.leitorSupervozLiteApiUrl;
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
      leitorSupervozProcessingMode: supervozProcessingMode.value,
      leitorSupervozApiUrl: normalizeApiUrl(supervozApiUrl.value),
      leitorSupervozLiteApiUrl: normalizeApiUrl(supervozLiteApiUrl.value, DEFAULT_SUPERVOZ_LITE_API_URL),
      leitorHfToken: hfToken.value,
      leitorSupervozApiToken: hfToken.value,
      leitorSupervozMode: supervozMode.value,
      leitorSupervozNfeStep: nfeStep,
      leitorSupervozFallbackNative: supervozFallbackNative.checked,
      leitorSupervozPrefetchEnabled: supervozPrefetchEnabled.checked
    });
    chrome.storage.local.set(settings, () => {
      supervozProcessingMode.value = settings.leitorSupervozProcessingMode;
      supervozNfeStep.value = String(settings.leitorSupervozNfeStep);
      supervozApiUrl.value = settings.leitorSupervozApiUrl;
      supervozLiteApiUrl.value = settings.leitorSupervozLiteApiUrl;
      hfToken.value = settings.leitorHfToken;
      supervozFallbackNative.checked = settings.leitorSupervozFallbackNative === true;
      supervozPrefetchEnabled.checked = settings.leitorSupervozPrefetchEnabled === true;
      updateDiagnostics(settings);
      setStatus('Configuração salva.');
    });
  });

  testSupervoz.addEventListener('click', async () => {
    const processingMode = normalizeProcessingMode(supervozProcessingMode.value);
    const apiUrl = effectiveSupervozApiUrl({
      leitorSupervozProcessingMode: processingMode,
      leitorSupervozApiUrl: supervozApiUrl.value,
      leitorSupervozLiteApiUrl: supervozLiteApiUrl.value
    });
    const token = normalizeToken(hfToken.value, apiUrl);

    setStatus('Testando...');
    updateDiagnosticsFromForm({endpoint: '/health', health: 'testando', lastError: '-'});
    try {
      let response = await supervozRequest('/health', {apiUrl, token});
      if (response.status === 401 && DEFAULT_SUPERVOZ_API_TOKEN && apiUrl === DEFAULT_SUPERVOZ_API_URL) {
        hfToken.value = DEFAULT_SUPERVOZ_API_TOKEN;
        chrome.storage.local.set({
          leitorHfToken: DEFAULT_SUPERVOZ_API_TOKEN,
          leitorSupervozApiToken: DEFAULT_SUPERVOZ_API_TOKEN
        });
        response = await supervozRequest('/health', {apiUrl, token: DEFAULT_SUPERVOZ_API_TOKEN});
      }
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

  [ttsProvider, supervozProcessingMode, supervozApiUrl, supervozLiteApiUrl, hfToken, supervozMode, supervozNfeStep, supervozFallbackNative, supervozPrefetchEnabled].forEach((element) => {
    element.addEventListener('change', () => updateDiagnosticsFromForm());
    element.addEventListener('input', () => updateDiagnosticsFromForm());
  });

  function normalizeApiUrl(value, fallback = DEFAULT_SUPERVOZ_API_URL) {
    const raw = cleanConfigValue(value || fallback) || fallback;
    if (!raw) return '';
    let normalized = raw.replace(/\/+$/, '').replace(/\/(tts|health|voices)$/, '');
    if (LEGACY_SUPERVOZ_API_URLS.includes(normalized)) {
      normalized = DEFAULT_SUPERVOZ_API_URL;
    }
    return normalized;
  }

  function normalizeSettings(items) {
    const normalized = Object.assign({}, DEFAULT_SETTINGS, items || {});
    normalized.leitorSupervozApiUrl = normalizeApiUrl(normalized.leitorSupervozApiUrl);
    normalized.leitorSupervozLiteApiUrl = normalizeApiUrl(normalized.leitorSupervozLiteApiUrl, DEFAULT_SUPERVOZ_LITE_API_URL);
    normalized.leitorSupervozProcessingMode = normalizeProcessingMode(normalized.leitorSupervozProcessingMode);
    const effectiveUrl = effectiveSupervozApiUrl(normalized);
    const configuredToken = normalized.leitorSupervozApiToken || normalized.leitorHfToken;
    const token = normalizeToken(configuredToken, effectiveUrl);
    normalized.leitorHfToken = token;
    normalized.leitorSupervozApiToken = token;
    normalized.leitorTtsProvider = normalized.leitorTtsProvider || DEFAULT_SETTINGS.leitorTtsProvider;
    normalized.leitorSupervozMode = normalized.leitorSupervozMode || DEFAULT_SETTINGS.leitorSupervozMode;
    normalized.leitorSupervozNfeStep = Number(normalized.leitorSupervozNfeStep) || DEFAULT_SETTINGS.leitorSupervozNfeStep;
    normalized.leitorSupervozFallbackNative = normalized.leitorSupervozFallbackNative === true;
    normalized.leitorSupervozPrefetchEnabled = normalized.leitorSupervozPrefetchEnabled === true;
    if (normalized.leitorSupervozProcessingMode === 'lite') {
      normalized.leitorSupervozMode = 'fast';
      normalized.leitorSupervozNfeStep = Math.max(10, Math.min(16, normalized.leitorSupervozNfeStep || 12));
    }
    return normalized;
  }

  function normalizeProcessingMode(value) {
    return value === 'lite' ? 'lite' : 'ultra';
  }

  function effectiveSupervozApiUrl(settings) {
    const processingMode = normalizeProcessingMode(settings.leitorSupervozProcessingMode);
    if (processingMode === 'lite') {
      return normalizeApiUrl(settings.leitorSupervozLiteApiUrl, DEFAULT_SUPERVOZ_LITE_API_URL);
    }
    return normalizeApiUrl(settings.leitorSupervozApiUrl, DEFAULT_SUPERVOZ_API_URL);
  }

  function normalizeToken(value, apiUrl) {
    const token = cleanConfigValue(value).replace(/^Bearer\s+/i, '').trim();
    if (DEFAULT_SUPERVOZ_API_TOKEN && normalizeApiUrl(apiUrl, '') === DEFAULT_SUPERVOZ_API_URL) {
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

  function getDefaultSupervozLiteUrl() {
    const defaults = globalThis.LEITOR_SUPERVOZ_DEFAULTS || {};
    return cleanConfigValue(defaults.liteApiUrl);
  }

  function cleanConfigValue(value) {
    return String(value || '').trim().replace(/^['"]+|['"]+$/g, '').trim();
  }

  function supervozRequest(endpoint, options = {}) {
    const selectedApiUrl = options.apiUrl !== undefined ? options.apiUrl : effectiveSupervozApiUrl({
      leitorSupervozProcessingMode: supervozProcessingMode.value,
      leitorSupervozApiUrl: supervozApiUrl.value,
      leitorSupervozLiteApiUrl: supervozLiteApiUrl.value
    });
    const apiUrl = normalizeApiUrl(selectedApiUrl, '');
    if (!apiUrl) {
      return Promise.reject(new Error('URL da API SuperVoz não configurada para o modo selecionado.'));
    }
    const token = normalizeToken(options.token || hfToken.value, apiUrl);
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const method = options.method || 'GET';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeoutMs || HEALTH_TIMEOUT_MS);

    console.log('[Popup][SuperVoz] endpoint:', normalizedEndpoint);
    console.log('[Popup][SuperVoz] method:', method);
    console.log('[Popup][SuperVoz] token existe:', Boolean(token));
    console.log('[Popup][SuperVoz] token preview:', token ? `${token.slice(0, 4)}****` : 'ausente');

    return fetch(`${apiUrl}${normalizedEndpoint}`, {
      method,
      headers: Object.assign({}, buildAuthHeaders(token), options.headers || {}),
      body: options.body,
      signal: controller.signal
    }).then((response) => {
      console.log('[Popup][SuperVoz] status:', response.status);
      return response;
    }).finally(() => clearTimeout(timeoutId));
  }

  function buildAuthHeaders(token) {
    if (!token) return {};
    return {
      Authorization: `Bearer ${token}`,
      'X-API-Token': token
    };
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
      leitorSupervozProcessingMode: supervozProcessingMode.value,
      leitorSupervozApiUrl: supervozApiUrl.value,
      leitorSupervozLiteApiUrl: supervozLiteApiUrl.value,
      leitorHfToken: hfToken.value,
      leitorSupervozApiToken: hfToken.value,
      leitorSupervozMode: supervozMode.value,
      leitorSupervozNfeStep: supervozNfeStep.value,
      leitorSupervozFallbackNative: supervozFallbackNative.checked,
      leitorSupervozPrefetchEnabled: supervozPrefetchEnabled.checked
    });
    diagBackendUrl.textContent = effectiveSupervozApiUrl(normalized) || 'configure a URL Lite';
    diagProcessingMode.textContent = normalized.leitorSupervozProcessingMode === 'lite' ? 'Modo Lite (CPU)' : 'Modo Ultra (GPU)';
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

  console.log('[Popup] Leitor Estácio carregado');
});
