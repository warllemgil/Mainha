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

  const DEFAULT_SETTINGS = {
    leitorTtsProvider: 'native',
    leitorSupervozApiUrl: 'https://warllem-supervoz-f5-api.hf.space',
    leitorHfToken: '',
    leitorSupervozMode: 'fast',
    leitorSupervozNfeStep: 8
  };

  function setStatus(message, isError = false) {
    settingsStatus.textContent = message;
    settingsStatus.style.color = isError ? '#fc8181' : '#68d391';
  }

  chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
    ttsProvider.value = items.leitorTtsProvider || DEFAULT_SETTINGS.leitorTtsProvider;
    supervozApiUrl.value = items.leitorSupervozApiUrl || DEFAULT_SETTINGS.leitorSupervozApiUrl;
    hfToken.value = items.leitorHfToken || '';
    supervozMode.value = items.leitorSupervozMode || DEFAULT_SETTINGS.leitorSupervozMode;
    supervozNfeStep.value = String(items.leitorSupervozNfeStep || DEFAULT_SETTINGS.leitorSupervozNfeStep);
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
    chrome.storage.local.set({
      leitorTtsProvider: ttsProvider.value,
      leitorSupervozApiUrl: normalizeApiUrl(supervozApiUrl.value),
      leitorHfToken: hfToken.value.trim(),
      leitorSupervozMode: supervozMode.value,
      leitorSupervozNfeStep: nfeStep
    }, () => {
      supervozNfeStep.value = String(nfeStep);
      supervozApiUrl.value = normalizeApiUrl(supervozApiUrl.value);
      setStatus('Configuração salva.');
    });
  });

  testSupervoz.addEventListener('click', async () => {
    const apiUrl = normalizeApiUrl(supervozApiUrl.value);
    const token = hfToken.value.trim();
    if (!token) {
      setStatus('Informe o token da API antes de testar.', true);
      return;
    }

    setStatus('Testando...');
    try {
      const response = await fetch(`${apiUrl}/health`, {
        headers: { Authorization: `Bearer ${token}` }
      });
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
    const fallback = DEFAULT_SETTINGS.leitorSupervozApiUrl;
    const raw = (value || fallback).trim() || fallback;
    return raw.replace(/\/+$/, '').replace(/\/tts$/, '');
  }

  console.log('[Popup] Leitor Estácio carregado');
});
