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
  const saveSettings = document.getElementById('saveSettings');
  const testSupervoz = document.getElementById('testSupervoz');
  const settingsStatus = document.getElementById('settingsStatus');
  const DEFAULT_SUPERVOZ_API_URL = 'https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run';
  const LEGACY_SUPERVOZ_API_URLS = [
    'https://warllem-supervoz-f5-api.hf.space'
  ];
  const DEFAULT_SUPERVOZ_API_TOKEN = getDefaultSupervozToken();

  const DEFAULT_SETTINGS = {
    leitorTtsProvider: 'supervoz',
    leitorSupervozApiUrl: DEFAULT_SUPERVOZ_API_URL,
    leitorHfToken: DEFAULT_SUPERVOZ_API_TOKEN,
    leitorSupervozMode: 'balanced',
    leitorSupervozNfeStep: 32
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
      leitorSupervozMode: supervozMode.value,
      leitorSupervozNfeStep: nfeStep
    });
    chrome.storage.local.set(settings, () => {
      supervozNfeStep.value = String(settings.leitorSupervozNfeStep);
      supervozApiUrl.value = settings.leitorSupervozApiUrl;
      hfToken.value = settings.leitorHfToken;
      setStatus('Configuração salva.');
    });
  });

  testSupervoz.addEventListener('click', async () => {
    const apiUrl = normalizeApiUrl(supervozApiUrl.value);
    const token = normalizeToken(hfToken.value, apiUrl);

    setStatus('Testando...');
    try {
      let response = await testarHealth(apiUrl, token);
      if (response.status === 401 && DEFAULT_SUPERVOZ_API_TOKEN && apiUrl === DEFAULT_SUPERVOZ_API_URL) {
        hfToken.value = DEFAULT_SUPERVOZ_API_TOKEN;
        chrome.storage.local.set({ leitorHfToken: DEFAULT_SUPERVOZ_API_TOKEN });
        response = await testarHealth(apiUrl, DEFAULT_SUPERVOZ_API_TOKEN);
      }
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setStatus(`OK: ${data.status}, ${data.device}, model_loaded=${data.model_loaded}`);
    } catch (error) {
      setStatus(`Falha: ${error.message}`, true);
    }
  });

  function normalizeApiUrl(value) {
    const fallback = DEFAULT_SUPERVOZ_API_URL;
    const raw = (value || fallback).trim() || fallback;
    let normalized = raw.replace(/\/+$/, '').replace(/\/(tts|health|voices)$/, '');
    if (LEGACY_SUPERVOZ_API_URLS.includes(normalized)) {
      normalized = DEFAULT_SUPERVOZ_API_URL;
    }
    return normalized;
  }

  function normalizeSettings(items) {
    const normalized = Object.assign({}, DEFAULT_SETTINGS, items || {});
    normalized.leitorSupervozApiUrl = normalizeApiUrl(normalized.leitorSupervozApiUrl);
    normalized.leitorHfToken = normalizeToken(normalized.leitorHfToken, normalized.leitorSupervozApiUrl);
    normalized.leitorTtsProvider = normalized.leitorTtsProvider || DEFAULT_SETTINGS.leitorTtsProvider;
    normalized.leitorSupervozMode = normalized.leitorSupervozMode || DEFAULT_SETTINGS.leitorSupervozMode;
    normalized.leitorSupervozNfeStep = Number(normalized.leitorSupervozNfeStep) || DEFAULT_SETTINGS.leitorSupervozNfeStep;
    return normalized;
  }

  function normalizeToken(value, apiUrl) {
    const token = (value || '').trim().replace(/^Bearer\s+/i, '').trim();
    if (DEFAULT_SUPERVOZ_API_TOKEN && normalizeApiUrl(apiUrl) === DEFAULT_SUPERVOZ_API_URL) {
      return DEFAULT_SUPERVOZ_API_TOKEN;
    }
    return token;
  }

  function getDefaultSupervozToken() {
    const defaults = globalThis.LEITOR_SUPERVOZ_DEFAULTS || {};
    return (defaults.apiToken || '').trim().replace(/^Bearer\s+/i, '').trim();
  }

  function testarHealth(apiUrl, token) {
    return fetch(`${apiUrl}/health`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  console.log('[Popup] Leitor Estácio carregado');
});
