# 🎯 ESTRATÉGIA FINAL — Leitor Estácio com iframes Bloqueados

## Problema Identificado
```
Página: https://estudante.estacio.br/disciplinas/.../conteudos/...
   └─ iframe #1: https://conteudo.ensineme.com.br/en/00939?brand=estacio
      └─ ❌ BLOQUEADO por CORS
      └─ ✅ MAS CONTEÚDO ESTÁ AQUI (56+ blocos)
   └─ iframe #2: about:blank (vazio, ignorar)
```

---

## Solução Implementada: postMessage Bridge

```
┌─────────────────────────────────────────────────────────┐
│ PÁGINA PRINCIPAL (https://estudante.estacio.br)        │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [content.js - PÁGINA PRINCIPAL]                       │
│  ├─ detectarEExtrairDosIframes()                       │
│  │  ├─ Encontra: <iframe src="...conteudo.ensineme"> │
│  │  ├─ Tenta: iframe.contentDocument (❌ BLOQUEADO)   │
│  │  └─ Envia: postMessage({type: 'request-content'}) │
│  │                              ▼                      │
│  ├─ window.addEventListener('message', (e) => {      │
│  │    if (e.data.type === 'leitor-estacio:content') │
│  │      blocosDosIframes.push(e.data.text)           │
│  │  })                                               │
│  │                              ▲                      │
│  └─ extrairBlocosComIframes() [Promise]              │
│     └─ Aguarda 1.5s por resposta                    │
│                                                       │
└─────────────────────────────────────────────────────────┘
                         ▲  ▼
       postMessage Bridge (cross-origin OK!)
                         ▲  ▼
┌─────────────────────────────────────────────────────────┐
│ IFRAME BLOQUEADO (https://conteudo.ensineme.com.br)    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  [content.js - DENTRO DO IFRAME]                      │
│  ├─ window !== window.top → modo IFRAME              │
│  ├─ window.addEventListener('message', (e) => {     │
│  │    if (e.data.type === 'request-content') {      │
│  │      blocos = extrairBlocos() ← 56+ blocos aqui! │
│  │      window.top.postMessage({                     │
│  │        type: 'leitor-estacio:content',            │
│  │        text: blocos.map(b => b.texto),            │
│  │        title: document.title                      │
│  │      }, '*')                                       │
│  │    }                                              │
│  │  })                                               │
│  └─ NÃO cria player aqui                             │
│                                                       │
└─────────────────────────────────────────────────────────┘
```

---

## Fluxo Completo

```
USUÁRIO CLICA ▶
    ↓
iniciarLeitura()
    ↓
statusEl = "Carregando conteúdo…"
    ↓
extrairBlocosComIframes() [Promise]
    ├─ detectarEExtrairDosIframes()
    │  ├─ querySelector('iframe')
    │  ├─ Try: contentDocument → ❌
    │  └─ postMessage para iframe
    ├─ Aguarda window.addEventListener('message')
    └─ setTimeout 1.5s
    ↓
.then(blocos => {
    if (blocos.length > 0) {
        ✅ Usar blocos (do iframe ou body)
        lendo = true
        lerBloco(0)
    } else {
        ❌ "Sem texto na página"
    }
})
    ↓
lerBloco(0) ← 1º bloco
    ├─ Se elemento !== null → destaca + scroll
    ├─ Cria utterance
    └─ speechSynthesis.speak()
        ↓ onend
        ↓
    lerBloco(1) ← 2º bloco
    ...
```

---

## Código-Chave Adicionado

### 1️⃣ Detectar iframes e enviar postMessage
```javascript
function detectarEExtrairDosIframes() {
  const iframes = document.querySelectorAll('iframe');
  
  iframes.forEach((iframe, idx) => {
    // Tenta acesso direto
    try {
      const doc = iframe.contentDocument;
      if (doc) { /* extracted */ }
    } catch (e) {
      // iframe bloqueado → postMessage
      iframe.contentWindow.postMessage(
        { type: 'leitor-estacio:request-content' },
        '*'
      );
    }
  });
}
```

### 2️⃣ Escutar resposta do iframe
```javascript
window.addEventListener('message', (e) => {
  if (e.data.type === 'leitor-estacio:content') {
    // iframe respondeu com conteúdo
    e.data.text.forEach(texto => {
      blocosDosIframes.push({
        texto: texto,
        elemento: null  // ← vindo do postMessage
      });
    });
  }
});
```

### 3️⃣ Função wrapper com Promise
```javascript
function extrairBlocosComIframes() {
  return new Promise((resolve) => {
    detectarEExtrairDosIframes();
    
    setTimeout(() => {
      if (blocosDosIframes.length > 0) {
        resolve(blocosDosIframes);
      } else {
        resolve(extrairBlocos()); // fallback body
      }
    }, 1500);
  });
}
```

### 4️⃣ iniciarLeitura() com Promise
```javascript
function iniciarLeitura() {
  statusEl.textContent = 'Carregando…';
  
  extrairBlocosComIframes().then((blocosExtraidos) => {
    blocos = blocosExtraidos;
    if (blocos.length > 0) {
      lendo = true;
      lerBloco(0);
    }
  });
}
```

### 5️⃣ lerBloco() com null-safe elementos
```javascript
function lerBloco(indice) {
  const { texto, elemento } = blocos[indice];
  
  // Elemento pode ser null se vindo do postMessage
  if (elemento && elemento.classList) {
    elemento.classList.add('leitor-paragrafo-ativo');
    elemento.scrollIntoView();
  }
  
  // Sempre fala, com ou sem elemento
  utterance = new SpeechSynthesisUtterance(texto);
  speechSynthesis.speak(utterance);
}
```

---

## Status

✅ **Implementado:**
- postMessage strategy completa
- detectarEExtrairDosIframes()
- extrairBlocosComIframes() com Promise
- iniciarLeitura() refatorada
- lerBloco() null-safe

🔄 **Aguardando:**
- Teste em página real com iframe bloqueado
- Verificação se postMessage consegue responder
- Contagem de blocos extraídos

---

## Próximo Passo

1. **Reload da extensão** (chrome://extensions 🔄)
2. **Abra página de aula com iframe**
3. **F12 → Console → procure por:**
   ```
   [Leitor] 📨 Iframe #1: https://conteudo.ensineme.com.br
   [Leitor] 📤 postMessage enviado para iframe #1
   [Leitor] 📩 Conteúdo recebido do iframe
   ```
4. **Clique em ▶ e reporte quantos blocos extraiu!**

---

## Se postMessage não funcionar...

Próxima estratégia:
- ❌ postMessage falhou? → implementar fetch via background.js
- background.js faz request HTTP direto para iframe URL
- Extrai HTML com `new DOMParser()`
- Retorna conteúdo para content.js via `chrome.runtime.sendMessage()`

---

**Status Geral: 🚀 Pronto para teste!**
