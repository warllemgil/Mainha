// Leitor Estácio — content.js
// Implementação do player flutuante, extração de blocos, postMessage para iframes e síntese de voz
(function(){
  if (typeof window === 'undefined') return;

  // --- Helpers ---
  function log(...args){ try{ console.log('[Leitor]', ...args);}catch(e){} }

  // --- Função Comum de Extração ---
  function extrairBlocosFromBody(isIframe = false){
    const candidates = [];
    let root = document.body;
    
    // Se estivermos na página principal da Estácio, tentar focar onde fica o conteúdo
    if (!isIframe) {
      const conteudoMain = document.querySelector('main') || document.querySelector('#root') || document.body;
      root = conteudoMain;
      
      // Marcar menus para ignorar (evitar ler a sidebar)
      const menus = document.querySelectorAll('nav, aside, header, [role="navigation"], [class*="sidebar"], [class*="menu"]');
      menus.forEach(m => m.setAttribute('data-leitor-ignore', 'true'));
    }

    if (!root) return [];
    
    const selectors = 'h1,h2,h3,h4,h5,h6,p,li,blockquote,figcaption,td,th';
    const elements = root.querySelectorAll(selectors);
    
    elements.forEach(el => {
      if (!isIframe && el.closest('[data-leitor-ignore="true"]')) return;
      
      // EVITA REPETIÇÃO: Se o elemento atual possui algum filho que também será extraído,
      // pulamos este pai para não ler o texto duplicado.
      if (el.querySelector(selectors)) return;
      
      const text = el.innerText && el.innerText.trim();
      // Ignorar textos muito curtos ou "botões" genéricos
      if (text && text.length > 20){
        // Verifica se o texto já foi inserido logo antes para evitar duplicidade idêntica
        const textAlreadyExists = candidates.length > 0 && candidates[candidates.length - 1].texto === text;
        if (!textAlreadyExists) {
          candidates.push({texto: text, elemento: el});
        }
      }
    });
    
    if (candidates.length > 0) return candidates;

    // Fallback de texto bruto
    const bodyText = root.innerText || '';
    if (bodyText) {
      return bodyText.split(/\n{2,}/)
        .map(t => ({texto: t ? t.trim() : '', elemento: null}))
        .filter(b => b.texto && b.texto.length > 30);
    }
    
    return [];
  }

  // ==========================================
  // --- MODO IFRAME (Cross-Origin Bridge) ---
  // ==========================================
  if (window !== window.top) {
    log('Modo Iframe ativado. Extraindo e transmitindo...');
    
    let ultimosTextos = "";
    let blocosLocais = []; // Guarda referências aos elementos reais

    function enviarConteudo(force = false) {
      try {
        blocosLocais = extrairBlocosFromBody(true);
        const textos = blocosLocais.map(b => b.texto);
        const concatTextos = textos.join('|');
        
        // Envia se houver mudança OU se for um pedido explícito (force)
        if (textos.length > 0 && (force || concatTextos !== ultimosTextos)) {
          ultimosTextos = concatTextos;
          const payload = {
            type: 'leitor-estacio:content',
            text: textos,
            title: document.title,
            sourceUrl: window.location.href
          };
          window.top.postMessage(payload, '*');
          log(`[Iframe Auto-Sync] Enviado ${textos.length} blocos para a página principal.`);
        }
      } catch (err) {
        log('Erro na extração dentro do iframe:', err);
      }
    }

    function limparDestaquesLocais() {
      document.querySelectorAll('.leitor-paragrafo-ativo').forEach(el => el.classList.remove('leitor-paragrafo-ativo'));
    }

    // Tentar enviar logo ao carregar e a cada 3 segundos caso o SPA mude dentro do iframe
    window.addEventListener('load', () => enviarConteudo(false));
    setInterval(() => enviarConteudo(false), 3000);

    // Responder a requisições manuais e comandos de destaque
    window.addEventListener('message', (e) => {
      const d = e.data || {};
      
      if (d.type === 'leitor-estacio:request-content') {
        enviarConteudo(true); 
      }
      
      if (d.type === 'leitor-estacio:highlight') {
        limparDestaquesLocais();
        const idx = d.index;
        if (blocosLocais[idx] && blocosLocais[idx].elemento) {
          const el = blocosLocais[idx].elemento;
          el.classList.add('leitor-paragrafo-ativo');
          try { el.scrollIntoView({behavior:'smooth', block:'center'}); } catch(err){}
        }
      }

      if (d.type === 'leitor-estacio:clear-highlights') {
        limparDestaquesLocais();
      }
    });
    
    return; // O iframe não precisa do player visual
  }

  // ==========================================
  // --- MODO PRINCIPAL (Main Window) ---
  // ==========================================
  
  if (document.getElementById('leitor-estacio-player')) return;

  // --- Estado ---
  let blocos = [];
  let indiceAtual = 0;
  let lendo = false;
  let utterance = null;
  let audioAtual = null;
  let audioUrlAtual = null;
  let audioAbortController = null;
  let prefetchAbortController = null;
  let leituraSequencia = 0;
  const audioCache = new Map();
  const audioFetchesEmAndamento = new Map();
  const AUDIO_CACHE_MAX_ITEMS = 30;
  const SUPERVOZ_PREFETCH_AHEAD = 0;
  const SUPERVOZ_TTS_TIMEOUT_MS = 240000;
  let prefetchAtivo = false;
  let velocidadeIndex = 1;
  const velocidades = [0.8, 1.0, 1.2, 1.5, 1.8, 2.0];
  let voices = [];
  const DEFAULT_SUPERVOZ_API_URL = obterUrlPadraoSuperVoz() || 'https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run';
  const LEGACY_SUPERVOZ_API_URLS = [
    'https://warllem-supervoz-f5-api.hf.space'
  ];
  const DEFAULT_SUPERVOZ_API_TOKEN = obterTokenPadraoSuperVoz();
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
  let leitorSettings = Object.assign({}, DEFAULT_SETTINGS);
  
  // Cache de iframe
  let iframeCache = {
    blocos: [],
    ultimaAtualizacao: 0,
    url: ''
  };

  // Create player DOM
  const player = document.createElement('div');
  player.id = 'leitor-estacio-player';
  player.innerHTML = `
    <button id="leitor-btn-play">▶</button>
    <button class="leitor-nav-button" id="leitor-btn-prev">⏮</button>
    <div id="leitor-info">
      <div id="leitor-status">Aguardando...</div>
      <div id="leitor-progresso">0 / 0</div>
      <div id="leitor-barra-wrap"><div id="leitor-barra"></div></div>
    </div>
    <button class="leitor-nav-button" id="leitor-btn-next">⏭</button>
    <button id="leitor-velocidade">1.0×</button>
    <button id="leitor-modo-voz" title="Alternar motor de voz">Nativa</button>
    <button id="leitor-btn-stop">■</button>
    <button id="leitor-btn-debug" style="background:#ff9800;font-size:10px;padding:2px 5px;margin-left:5px;">🔍</button>
  `;
  player.style.opacity = 0.99;
  document.body.appendChild(player);

  const btnPlay = document.getElementById('leitor-btn-play');
  const btnPrev = document.getElementById('leitor-btn-prev');
  const btnNext = document.getElementById('leitor-btn-next');
  const btnStop = document.getElementById('leitor-btn-stop');
  const velocidadeBtn = document.getElementById('leitor-velocidade');
  const modoVozBtn = document.getElementById('leitor-modo-voz');
  const status = document.getElementById('leitor-status');
  const progresso = document.getElementById('leitor-progresso');
  const barra = document.getElementById('leitor-barra');
  const btnDebug = document.getElementById('leitor-btn-debug');

  // --- Função de Depuração na Tela ---
  btnDebug.addEventListener('click', () => {
    let debugInfo = "=== MAPA DA PÁGINA ===\n\n";
    
    // 1. IFRAMES
    const iframes = document.querySelectorAll('iframe');
    debugInfo += `[Iframes encontrados]: ${iframes.length}\n`;
    iframes.forEach((ifr, i) => {
      debugInfo += `  Iframe ${i}: ${ifr.src.substring(0, 80)}...\n`;
      try {
        const doc = ifr.contentDocument;
        if (doc) debugInfo += `    -> Acesso Same-Origin OK! Texto interno: ${doc.body.innerText.length} caracteres.\n`;
        else debugInfo += `    -> Bloqueado por CORS (cross-origin).\n`;
      } catch(e) { debugInfo += `    -> Erro de Acesso: ${e.message}\n`; }
    });

    // 2. TEXTO DA PÁGINA PRINCIPAL
    const rootText = document.getElementById('root') ? document.getElementById('root').innerText.length : 0;
    debugInfo += `\n[Página Principal]\n  Caracteres no <div id="root">: ${rootText}\n`;
    
    const textosSemMenu = extrairBlocosFromBody(false);
    debugInfo += `  Blocos filtrados (sem menu): ${textosSemMenu.length}\n`;
    if (textosSemMenu.length > 0) {
      debugInfo += `  Preview do 1º bloco: "${textosSemMenu[0].texto.substring(0, 50)}..."\n`;
    }

    // 3. CACHE DO IFRAME (postMessage)
    debugInfo += `\n[Comunicação postMessage]\n`;
    debugInfo += `  Blocos recebidos do Iframe: ${iframeCache.blocos.length}\n`;
    debugInfo += `  URL Fonte: ${iframeCache.url}\n`;
    
    // Mostrar em um alerta para o usuário poder ler/copiar
    alert(debugInfo);
  });

  // Load Voices
  function loadVoices(){ voices = speechSynthesis.getVoices() || []; }
  loadVoices();
  speechSynthesis.onvoiceschanged = loadVoices;

  function carregarConfiguracoes(){
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
      atualizarUI();
      return;
    }

    chrome.storage.local.get(DEFAULT_SETTINGS, (items) => {
      leitorSettings = normalizarConfiguracoes(Object.assign({}, DEFAULT_SETTINGS, items || {}));
      chrome.storage.local.set(leitorSettings);
      atualizarUI();
    });
  }

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== 'local') return;
      Object.keys(DEFAULT_SETTINGS).forEach((key) => {
        if (changes[key]) leitorSettings[key] = changes[key].newValue;
      });
      leitorSettings = normalizarConfiguracoes(leitorSettings);
      atualizarUI();
    });
  }

  // Listener contínuo para receber dados de iframes a qualquer momento
  window.addEventListener('message', (e) => {
    try {
      const d = e.data || {};
      if (d && d.type === 'leitor-estacio:content' && d.text) {
        const arr = Array.isArray(d.text) ? d.text : [d.text];
        
        const blocosRecebidos = [];
        arr.forEach(t => {
          if (t && typeof t === 'string' && t.trim().length > 0) {
            blocosRecebidos.push({texto: t.trim(), elemento: null});
          }
        });
        
        if (blocosRecebidos.length > 0) {
          iframeCache.blocos = blocosRecebidos;
          iframeCache.ultimaAtualizacao = Date.now();
          iframeCache.url = d.sourceUrl || 'desconhecido';
          log(`[Sync] Cache atualizado com ${blocosRecebidos.length} blocos do iframe.`);
          status.textContent = 'Conteúdo da aula carregado';
        }
      }
    } catch(err) { log('Erro no listener principal', err.message); }
  }, false);

  function solicitarAosIframes() {
    const iframes = Array.from(document.querySelectorAll('iframe'));
    iframes.forEach(iframe => {
      try { iframe.contentWindow.postMessage({type:'leitor-estacio:request-content'}, '*'); } catch(_) {}
    });
  }

  async function extrairBlocosComDecisao(){
    status.textContent = 'Buscando conteúdo...';
    
    // 1. Envia um gatilho manual para todos os iframes da página para responderem agora
    solicitarAosIframes();
    
    // 2. Aguarda um momento caso o iframe responda a tempo
    await new Promise(r => setTimeout(r, 1200));
    
    // 3. Verifica se temos algo no cache do iframe (mais confiável)
    // Se recebemos dados do iframe atual, usamos eles sempre. O cache é limpo a cada mudança de rota.
    if (iframeCache.blocos.length > 0) {
      log('Usando conteúdo do cache do iframe.', iframeCache.blocos.length, 'blocos');
      return iframeCache.blocos;
    }

    // 4. Se o iframe não respondeu, tenta same-origin direto
    const iframesResponses = [];
    document.querySelectorAll('iframe').forEach(iframe => {
      try {
        const doc = iframe.contentDocument;
        if (doc) {
          const text = doc.body ? doc.body.innerText || '' : '';
          if (text && text.trim().length > 30) {
            const blocks = text.split(/\n{2,}/).map(t=>({texto:t.trim(), elemento:null})).filter(b=>b.texto && b.texto.length>30);
            if (blocks.length) Array.prototype.push.apply(iframesResponses, blocks);
          }
        }
      } catch(e) {}
    });

    if (iframesResponses.length > 0) {
      log('Usando conteúdo via same-origin direto.');
      return iframesResponses;
    }
    
    // 5. Fallback seguro para a página principal (ignorando sidebar)
    log('Iframe não encontrado ou vazio. Lendo página principal (fallback seguro).');
    const mainBody = extrairBlocosFromBody(false);
    return mainBody;
  }

  // --- Reading Logic ---
  function selecionarVoiceForUtterance(u){
    // Prioridade 1: Vozes Naturais/Neurais (Edge/Microsoft)
    const natural = voices.find(v => /natural|online/i.test(v.name) && (/pt[- ]?br/i.test(v.lang) || /brasil/i.test(v.name)));
    if (natural) { u.voice = natural; return; }
    
    // Prioridade 2: Vozes Google Premium/Standard (Chrome)
    const google = voices.find(v => /google/i.test(v.name) && (/pt[- ]?br/i.test(v.lang) || /brasil/i.test(v.name)));
    if (google) { u.voice = google; return; }
    
    // Prioridade 3: Voz Francisca (padrão antigo do Edge)
    const francisca = voices.find(v => /francisca/i.test(v.name));
    if (francisca) { u.voice = francisca; return; }
    
    // Prioridade 4: Qualquer voz em Português do Brasil
    const ptbr = voices.find(v => /pt[- ]?br/i.test(v.lang) || /pt[- ]?br/i.test(v.name));
    if (ptbr) { u.voice = ptbr; return; }
  }

  function atualizarUI(){
    progresso.textContent = `${indiceAtual+1} / ${Math.max(1, blocos.length)}`;
    barra.style.width = blocos.length ? `${Math.round(((indiceAtual+1)/blocos.length)*100)}%` : '0%';
    velocidadeBtn.textContent = velocidades[velocidadeIndex].toFixed(1) + '×';
    modoVozBtn.textContent = leitorSettings.leitorTtsProvider === 'supervoz' ? 'SuperVoz' : 'Nativa';
    modoVozBtn.classList.toggle('leitor-modo-supervoz', leitorSettings.leitorTtsProvider === 'supervoz');
  }

  function limparAudioAtual(){
    if (audioAbortController) {
      try { audioAbortController.abort(); } catch(e) {}
      audioAbortController = null;
    }
    if (audioAtual) {
      try { audioAtual.pause(); } catch(e) {}
      audioAtual.onended = null;
      audioAtual.onerror = null;
      audioAtual = null;
    }
    if (audioUrlAtual) {
      try { URL.revokeObjectURL(audioUrlAtual); } catch(e) {}
      audioUrlAtual = null;
    }
  }

  function abortarPrefetchSuperVoz(){
    if (prefetchAbortController) {
      try { prefetchAbortController.abort(); } catch(e) {}
      prefetchAbortController = null;
    }
    prefetchAtivo = false;
  }

  function chaveCacheSuperVoz(texto){
    return JSON.stringify({
      api_url: normalizarSupervozApiBaseUrl(),
      voice: 'warllem',
      text: texto,
      speed: velocidades[velocidadeIndex] || 1.0,
      mode: leitorSettings.leitorSupervozMode || 'fast',
      nfe_step: Number(leitorSettings.leitorSupervozNfeStep) || 8
    });
  }

  function normalizarSupervozApiBaseUrl(){
    return normalizarSupervozApiUrl(leitorSettings.leitorSupervozApiUrl);
  }

  function normalizarSupervozApiUrl(value){
    const configuredUrl = limparValorConfiguracao(value || DEFAULT_SUPERVOZ_API_URL);
    let normalized = configuredUrl.replace(/\/+$/, '').replace(/\/(tts|health|voices)$/, '');
    if (LEGACY_SUPERVOZ_API_URLS.includes(normalized)) {
      normalized = DEFAULT_SUPERVOZ_API_URL;
    }
    return normalized;
  }

  function normalizarConfiguracoes(settings){
    const normalized = Object.assign({}, DEFAULT_SETTINGS, settings || {});
    normalized.leitorSupervozApiUrl = normalizarSupervozApiUrl(normalized.leitorSupervozApiUrl);
    const configuredToken = normalized.leitorSupervozApiToken || normalized.leitorHfToken;
    const token = normalizarSupervozToken(configuredToken, normalized.leitorSupervozApiUrl);
    normalized.leitorHfToken = token;
    normalized.leitorSupervozApiToken = token;
    normalized.leitorTtsProvider = normalized.leitorTtsProvider || DEFAULT_SETTINGS.leitorTtsProvider;
    normalized.leitorSupervozMode = normalized.leitorSupervozMode || DEFAULT_SETTINGS.leitorSupervozMode;
    normalized.leitorSupervozNfeStep = Number(normalized.leitorSupervozNfeStep) || DEFAULT_SETTINGS.leitorSupervozNfeStep;
    normalized.leitorSupervozFallbackNative = normalized.leitorSupervozFallbackNative === true;
    normalized.leitorSupervozPrefetchEnabled = normalized.leitorSupervozPrefetchEnabled === true;
    return normalized;
  }

  function normalizarSupervozToken(value, apiUrl){
    const token = limparValorConfiguracao(value).replace(/^Bearer\s+/i, '').trim();
    if (DEFAULT_SUPERVOZ_API_TOKEN && normalizarSupervozApiUrl(apiUrl) === DEFAULT_SUPERVOZ_API_URL) {
      return DEFAULT_SUPERVOZ_API_TOKEN;
    }
    return token;
  }

  function obterTokenPadraoSuperVoz(){
    const defaults = globalThis.LEITOR_SUPERVOZ_DEFAULTS || {};
    return limparValorConfiguracao(defaults.apiToken).replace(/^Bearer\s+/i, '').trim();
  }

  function obterUrlPadraoSuperVoz(){
    const defaults = globalThis.LEITOR_SUPERVOZ_DEFAULTS || {};
    return limparValorConfiguracao(defaults.apiUrl);
  }

  function limparValorConfiguracao(value){
    return String(value || '').trim().replace(/^['"]+|['"]+$/g, '').trim();
  }

  function mascararToken(token){
    if (!token) return 'nao';
    return `${token.slice(0, 4)}...${token.length}`;
  }

  function registrarSupervoz(endpoint, status){
    const token = normalizarSupervozToken(leitorSettings.leitorSupervozApiToken || leitorSettings.leitorHfToken, leitorSettings.leitorSupervozApiUrl);
    log('[SuperVoz]', {
      url: normalizarSupervozApiBaseUrl(),
      endpoint,
      status: status || 'iniciando',
      token: mascararToken(token)
    });
  }

  function mensagemErroSuperVoz(error){
    if (!error) return 'Erro desconhecido na SuperVoz.';
    if (error.name === 'AbortError' || error.name === 'TimeoutError' || error.code === 'timeout') return 'Timeout: Backend demorou para responder.';
    if (error.status === 401) return 'HTTP 401: Token inválido ou ausente. Verifique API_AUTH_TOKEN.';
    if (error.status === 404) return 'HTTP 404: Endpoint não encontrado. Verifique a rota da API.';
    if (error.status) return `HTTP ${error.status}: Falha no backend SuperVoz.`;
    if (/Failed to fetch/i.test(error.message || '')) return 'Failed to fetch: API offline, CORS ou URL incorreta.';
    return error.message || 'Falha no backend SuperVoz.';
  }

  function criarErroHttpSuperVoz(status){
    const error = new Error(mensagemErroSuperVoz({status}));
    error.status = status;
    return error;
  }

  function criarSignalComTimeout(signal, timeoutMs){
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      const error = new Error('Timeout: Backend demorou para responder.');
      error.name = 'TimeoutError';
      error.code = 'timeout';
      try { controller.abort(error); } catch(_) { controller.abort(); }
    }, timeoutMs);

    if (signal) {
      if (signal.aborted) {
        controller.abort(signal.reason);
      } else {
        signal.addEventListener('abort', () => controller.abort(signal.reason), {once: true});
      }
    }

    return {
      signal: controller.signal,
      clear: () => clearTimeout(timeoutId)
    };
  }

  function salvarAudioNoCache(chave, blob){
    if (!blob || !blob.size) return;
    if (audioCache.has(chave)) audioCache.delete(chave);
    audioCache.set(chave, blob);

    while (audioCache.size > AUDIO_CACHE_MAX_ITEMS) {
      const primeiraChave = audioCache.keys().next().value;
      audioCache.delete(primeiraChave);
    }
  }

  async function buscarAudioSuperVoz(bloco, signal){
    const chave = chaveCacheSuperVoz(bloco.texto);
    const blobEmCache = audioCache.get(chave);
    if (blobEmCache) {
      log('SuperVoz cache hit');
      return blobEmCache;
    }

    const fetchExistente = audioFetchesEmAndamento.get(chave);
    if (fetchExistente) {
      log('SuperVoz aguardando fetch existente');
      return fetchExistente;
    }

    const requestPromise = supervozRequest('/tts', {
      method: 'POST',
      body: JSON.stringify({
        voice: 'warllem',
        text: bloco.texto,
        speed: velocidades[velocidadeIndex] || 1.0,
        mode: leitorSettings.leitorSupervozMode || 'fast',
        nfe_step: Number(leitorSettings.leitorSupervozNfeStep) || 8
      }),
      signal,
      timeoutMs: SUPERVOZ_TTS_TIMEOUT_MS,
      expectAudio: true
    }).then(async (response) => {
      if (response.status === 401 && DEFAULT_SUPERVOZ_API_TOKEN && normalizarSupervozApiBaseUrl() === DEFAULT_SUPERVOZ_API_URL) {
        leitorSettings.leitorHfToken = DEFAULT_SUPERVOZ_API_TOKEN;
        leitorSettings.leitorSupervozApiToken = DEFAULT_SUPERVOZ_API_TOKEN;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          chrome.storage.local.set({
            leitorHfToken: DEFAULT_SUPERVOZ_API_TOKEN,
            leitorSupervozApiToken: DEFAULT_SUPERVOZ_API_TOKEN
          });
        }
      }
      if (!response.ok) {
        throw criarErroHttpSuperVoz(response.status);
      }
      const contentType = response.headers.get('Content-Type') || '';
      if (!/audio\/wav|audio\/mpeg|application\/octet-stream/i.test(contentType)) {
        throw new Error(`Resposta inválida da SuperVoz: ${contentType || 'sem Content-Type'}`);
      }
      const blob = await response.blob();
      salvarAudioNoCache(chave, blob);
      return blob;
    }).finally(() => {
      audioFetchesEmAndamento.delete(chave);
    });

    audioFetchesEmAndamento.set(chave, requestPromise);
    return requestPromise;
  }

  async function preCarregarProximoBloco(){
    if (leitorSettings.leitorTtsProvider !== 'supervoz') return;
    if (!leitorSettings.leitorSupervozPrefetchEnabled) return;
    if (prefetchAtivo) return;

    const primeiroIndice = indiceAtual + 1;
    const ultimoIndice = Math.min(blocos.length - 1, indiceAtual + SUPERVOZ_PREFETCH_AHEAD);
    if (primeiroIndice > ultimoIndice) return;

    prefetchAtivo = true;
    prefetchAbortController = new AbortController();
    const controller = prefetchAbortController;

    try {
      for (let i = primeiroIndice; i <= ultimoIndice; i++) {
        if (controller.signal.aborted) break;

        const bloco = blocos[i];
        if (!bloco || !bloco.texto) continue;

        const chave = chaveCacheSuperVoz(bloco.texto);
        if (audioCache.has(chave) || audioFetchesEmAndamento.has(chave)) continue;

        try {
          await buscarAudioSuperVoz(bloco, controller.signal);
        } catch (err) {
          if (err && err.name === 'AbortError') break;
          log('prefetch SuperVoz falhou', err);
          break;
        }
      }
    } finally {
      if (prefetchAbortController === controller) {
        prefetchAbortController = null;
      }
      prefetchAtivo = false;
    }
  }

  function limparDestaques(){
    document.querySelectorAll('.leitor-paragrafo-ativo').forEach(el => el.classList.remove('leitor-paragrafo-ativo'));
    // Avisar iframes para limpar também
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(ifr => { try { ifr.contentWindow.postMessage({type:'leitor-estacio:clear-highlights'}, '*'); } catch(e){} });
  }

  function pararLeitura(){
    leituraSequencia++;
    speechSynthesis.cancel();
    limparAudioAtual();
    abortarPrefetchSuperVoz();
    lendo = false;
    if (utterance){ utterance.onend = null; utterance.onerror = null; }
    utterance = null;
    status.textContent = 'Parado';
    btnPlay.textContent = '▶';
    limparDestaques();
    atualizarUI();
  }

  function pausarLeitura(){
    if (audioAtual && !audioAtual.paused) {
      audioAtual.pause();
      lendo = false;
      status.textContent = 'Pausado';
      btnPlay.textContent = '▶';
      return;
    }
    speechSynthesis.pause();
    lendo = false;
    status.textContent = 'Pausado';
    btnPlay.textContent = '▶';
  }

  function retomarLeitura(){
    if (audioAtual && audioAtual.paused) {
      audioAtual.play().then(() => {
        lendo = true;
        status.textContent = 'Lendo';
        btnPlay.textContent = '⏸';
      }).catch((err) => {
        log('erro ao retomar audio SuperVoz', err);
        pararLeitura();
      });
      return;
    }
    speechSynthesis.resume();
    lendo = true;
    status.textContent = 'Lendo';
    btnPlay.textContent = '⏸';
  }

  function falarNativo(bloco, sequenciaLocal){
    limparAudioAtual();
    if (utterance) { utterance.onend = null; utterance.onerror = null; }
    utterance = new SpeechSynthesisUtterance(bloco.texto);
    utterance.rate = velocidades[velocidadeIndex] || 1.0;
    selecionarVoiceForUtterance(utterance);
    
    utterance.onend = () => {
      if (sequenciaLocal !== leituraSequencia) return;
      if (indiceAtual+1 < blocos.length) lerBloco(indiceAtual+1);
      else { pararLeitura(); }
    };
    utterance.onerror = (e) => { log('speech error', e); pararLeitura(); };
    
    status.textContent = `Lendo (${indiceAtual+1}/${blocos.length})`;
    btnPlay.textContent = '⏸';
    lendo = true;
    
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  async function falarSuperVoz(bloco, sequenciaLocal){
    speechSynthesis.cancel();
    limparAudioAtual();

    audioAbortController = new AbortController();
    status.textContent = `Gerando SuperVoz (${indiceAtual+1}/${blocos.length})`;
    btnPlay.textContent = '...';
    lendo = true;

    try {
      const blob = await buscarAudioSuperVoz(bloco, audioAbortController.signal);
      if (sequenciaLocal !== leituraSequencia) return;

      audioUrlAtual = URL.createObjectURL(blob);
      audioAtual = new Audio(audioUrlAtual);
      audioAtual.onended = () => {
        if (sequenciaLocal !== leituraSequencia) return;
        limparAudioAtual();
        if (indiceAtual+1 < blocos.length) lerBloco(indiceAtual+1);
        else { pararLeitura(); }
      };
      audioAtual.onerror = () => {
        log('erro ao tocar audio SuperVoz');
        if (sequenciaLocal !== leituraSequencia) return;
        limparAudioAtual();
        if (leitorSettings.leitorSupervozFallbackNative) {
          status.textContent = 'SuperVoz não tocou; usando voz nativa';
          falarNativo(bloco, sequenciaLocal);
          return;
        }
        status.textContent = 'Erro ao tocar áudio SuperVoz';
        lendo = false;
        btnPlay.textContent = '▶';
      };

      status.textContent = `Lendo SuperVoz (${indiceAtual+1}/${blocos.length})`;
      btnPlay.textContent = '⏸';
      await audioAtual.play();
      preCarregarProximoBloco();
    } catch (err) {
      if (err && err.name === 'AbortError' && sequenciaLocal !== leituraSequencia) return;
      const mensagem = mensagemErroSuperVoz(err);
      log('falha SuperVoz', mensagem, err);
      if (sequenciaLocal !== leituraSequencia) return;
      if (leitorSettings.leitorSupervozFallbackNative) {
        status.textContent = `${mensagem} Usando voz nativa.`;
        falarNativo(bloco, sequenciaLocal);
        return;
      }
      status.textContent = mensagem;
      lendo = false;
      btnPlay.textContent = '▶';
    }
  }

  function montarHeadersSuperVoz(){
    const headers = {'Content-Type': 'application/json'};
    const token = normalizarSupervozToken(leitorSettings.leitorSupervozApiToken || leitorSettings.leitorHfToken, leitorSettings.leitorSupervozApiUrl);
    if (token) {
      headers.Authorization = `Bearer ${token}`;
      headers['X-API-Token'] = token;
    }
    return headers;
  }

  async function supervozRequest(endpoint, options = {}){
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const method = options.method || 'GET';
    const timeout = criarSignalComTimeout(options.signal, options.timeoutMs || SUPERVOZ_TTS_TIMEOUT_MS);
    const token = normalizarSupervozToken(leitorSettings.leitorSupervozApiToken || leitorSettings.leitorHfToken, leitorSettings.leitorSupervozApiUrl);
    const headers = Object.assign({}, montarHeadersSuperVoz(), options.headers || {});
    const url = `${normalizarSupervozApiBaseUrl()}${normalizedEndpoint}`;

    log('[SuperVoz] endpoint:', normalizedEndpoint);
    log('[SuperVoz] method:', method);
    log('[SuperVoz] token existe:', Boolean(token));
    log('[SuperVoz] token preview:', token ? `${token.slice(0, 4)}****` : 'ausente');

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: options.body,
        signal: timeout.signal
      });
      log('[SuperVoz] status:', response.status);
      if (options.expectAudio && response.ok) {
        const contentType = response.headers.get('Content-Type') || '';
        if (!/audio\/wav|audio\/mpeg|application\/octet-stream/i.test(contentType)) {
          throw new Error(`Resposta inválida da SuperVoz: ${contentType || 'sem Content-Type'}`);
        }
      }
      return response;
    } finally {
      timeout.clear();
    }
  }

  function lerBloco(i){
    leituraSequencia++;
    const sequenciaLocal = leituraSequencia;
    if (!blocos || !blocos.length || i < 0 || i >= blocos.length){ pararLeitura(); return; }
    indiceAtual = i;
    const bloco = blocos[i];
    atualizarUI();
    limparDestaques();
    
    // Destaque local (se existir elemento)
    if (bloco.elemento && bloco.elemento instanceof Element){
      bloco.elemento.classList.add('leitor-paragrafo-ativo');
      try { bloco.elemento.scrollIntoView({behavior:'smooth', block:'center'}); } catch(e){}
    }

    // Destaque remoto (enviar para todos os iframes)
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(ifr => {
      try { ifr.contentWindow.postMessage({type:'leitor-estacio:highlight', index: i}, '*'); } catch(e){}
    });

    if (!bloco.texto || bloco.texto.trim().length===0){
      setTimeout(() => lerBloco(i+1), 50);
      return;
    }

    if (leitorSettings.leitorTtsProvider === 'supervoz') {
      falarSuperVoz(bloco, sequenciaLocal);
      return;
    }

    falarNativo(bloco, sequenciaLocal);
  }

  // --- Public Flow ---
  async function iniciarLeitura(){
    btnPlay.textContent = '...';
    const encontrados = await extrairBlocosComDecisao();
    blocos = encontrados || [];
    
    if (!blocos.length){
      status.textContent = 'Nenhum texto principal encontrado.';
      btnPlay.textContent = '▶';
      atualizarUI();
      return;
    }
    
    indiceAtual = 0;
    lerBloco(0);
  }

  // --- Controles UI ---
  btnPlay.addEventListener('click', ()=>{
    if (lendo){ pausarLeitura(); return; }
    if (speechSynthesis.paused && utterance){ retomarLeitura(); return; }
    iniciarLeitura();
  });

  btnStop.addEventListener('click', pararLeitura);
  btnPrev.addEventListener('click', ()=>{ if (indiceAtual>0) lerBloco(indiceAtual-1); });
  btnNext.addEventListener('click', ()=>{ if (indiceAtual+1 < blocos.length) lerBloco(indiceAtual+1); });
  velocidadeBtn.addEventListener('click', ()=>{
    velocidadeIndex = (velocidadeIndex+1) % velocidades.length;
    atualizarUI();
  });
  modoVozBtn.addEventListener('click', () => {
    leitorSettings.leitorTtsProvider = leitorSettings.leitorTtsProvider === 'supervoz' ? 'native' : 'supervoz';
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.set({ leitorTtsProvider: leitorSettings.leitorTtsProvider });
    }
    atualizarUI();
  });

  // --- SPA Route Detection ---
  let lastUrl = location.href; let lastTitle = document.title;
  setInterval(()=>{
    if (location.href !== lastUrl || document.title !== lastTitle){
      log('Mudança de rota detectada. Resetando estado.');
      lastUrl = location.href; lastTitle = document.title;
      
      speechSynthesis.cancel();
      limparAudioAtual();
      abortarPrefetchSuperVoz();
      limparDestaques();
      blocos = [];
      indiceAtual = 0;
      iframeCache.blocos = []; // Reseta cache
      iframeCache.url = '';
      
      status.textContent = 'Aguardando novo conteúdo...';
      btnPlay.textContent = '▶';
      atualizarUI();
      
      // Solicitar proativamente o conteúdo do novo iframe várias vezes (retry)
      setTimeout(solicitarAosIframes, 1000); 
      setTimeout(solicitarAosIframes, 3000); 
      setTimeout(solicitarAosIframes, 6000); 
    }
  }, 1000); // Checa a cada 1 segundo

  // Pedir aos iframes caso eles já existam
  setTimeout(solicitarAosIframes, 2000);
  window.addEventListener('pagehide', pararLeitura);
  window.addEventListener('beforeunload', pararLeitura);

  carregarConfiguracoes();
  atualizarUI();
  log('Leitor (v3 com Auto-Sync) injetado com sucesso.');
})();
