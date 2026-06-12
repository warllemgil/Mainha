// ============================================================
// Leitor Estácio — popup.js
// Script do popup que aparece ao clicar no ícone
// ============================================================

document.addEventListener('DOMContentLoaded', () => {
  const openExtensionSettings = document.getElementById('openExtensionSettings');
  const openDocs = document.getElementById('openDocs');
  const ttsProvider = document.getElementById('ttsProvider');
  const hfToken = document.getElementById('hfToken');
  const supervozMode = document.getElementById('supervozMode');
  const supervozNfeStep = document.getElementById('supervozNfeStep');
  const saveSettings = document.getElementById('saveSettings');
  const testSupervoz = document.getElementById('testSupervoz');
  const settingsStatus = document.getElementById('settingsStatus');

  const DEFAULT_SETTINGS = {
    leitorTtsProvider: 'native',
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
      leitorHfToken: hfToken.value.trim(),
      leitorSupervozMode: supervozMode.value,
      leitorSupervozNfeStep: nfeStep
    }, () => {
      supervozNfeStep.value = String(nfeStep);
      setStatus('Configuração salva.');
    });
  });

  testSupervoz.addEventListener('click', async () => {
    const token = hfToken.value.trim();
    if (!token) {
      setStatus('Informe o HF_TOKEN antes de testar.', true);
      return;
    }

    setStatus('Testando...');
    try {
      const response = await fetch('https://warllem-supervoz-f5-api.hf.space/health', {
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

  console.log('[Popup] Leitor Estácio carregado');
});
