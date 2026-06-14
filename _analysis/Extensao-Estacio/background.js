// ============================================================
// Leitor Estácio — background.js (Service Worker)
// Gerencia a extensão e comunica com content scripts
// ============================================================

// Evento ao instalar/atualizar a extensão
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('[Leitor Estácio] Extensão instalada com sucesso!');
  } else if (details.reason === 'update') {
    console.log('[Leitor Estácio] Extensão atualizada para v1.2.4');
  }
});

// Listener para mensagens do content.js (para futuras expansões)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVoices') {
    sendResponse({ success: true });
  }
});

console.log('[Leitor Estácio] Background service worker carregado');
