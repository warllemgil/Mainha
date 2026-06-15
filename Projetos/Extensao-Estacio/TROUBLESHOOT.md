## 🆘 Problemas com Extração de Conteúdo — Passo a Passo

### ✅ Mudanças Feitas (v1.2.2)

**Nova em v1.2.2:**

1. **Botão ⏮ (Anterior)** — Volta para o bloco anterior
2. **Botão ⏭ (Próximo)** — Pula para o próximo bloco
3. **Botão 🔄 (Recarregar)** — Detecta novo conteúdo manualmente
4. **Detecção automática de mudança de página** — Quando você clica em uma matéria, a extensão recarrega automaticamente

**Melhorias anteriores (v1.2.1):**

- Seletores CSS melhorados
- Delays até 15 segundos
- Console logging detalhado
- Comando `window.leitorDebug()`

### 🔧 Como Testar Agora

#### Passo 1: Recarregar a Extensão
1. Chrome → `chrome://extensions/`
2. Encontre "Leitor Estácio"
3. Clique no ícone 🔄 (recarregar)

#### Passo 2: Ir para uma página HTTP/HTTPS
1. Abra uma aula, artigo, documentação ou site comum
2. Espere **até 15 segundos** pela página carregar
3. Veja se o player mostra um número de blocos

#### Passo 3: Abrir Console e Debugar
1. Pressione **F12**
2. Vá para aba **Console**
3. Procure por logs com `[Leitor]`

#### Passo 4: Se ainda não funcionar
Execute no console:
```javascript
window.leitorDebug()
```

Isso vai mostrar:
- Quantos blocos foram encontrados
- Primeiros 3 blocos de amostra
- Diagnóstico de por que não está funcionando

### 📋 O que Fazer com o Diagnóstico

#### Se disser: "Encontrados 0 blocos"
Há 3 possibilidades:

**A) Conteúdo em iframe**
```javascript
// Verif no console:
document.querySelectorAll('iframe').length  // se > 0, é esse o problema
```
👉 **Solução:** As extensões Chrome não conseguem ler iframe por segurança. 
   Você pode:
   - Tentar em outra página/material
   - Reportar qual página está com iframe
   - Esperar por uma versão que inspira iframes

**B) Conteúdo como imagem/canvas**
- Abra DevTools (F12)
- Clique em inspecionar elemento no conteúdo
- Se for `<canvas>` ou `<img>`, infelizmente não dá pra ler

**C) Conteúdo carregando ainda mais lentamente**
- Aguarde mais um pouco (até 30 segundos)
- Alguns sites carregam conteúdo de forma lenta ou progressiva
- Execute `window.leitorDebug()` de novo

#### Se disser: "Encontrados 25 blocos"
✅ Ótimo! O problema não é a extração. 
- Clique em ▶ para começar a ler
- Se não sair som, pode ser problema de voz (Windows)

### 📞 Informações Úteis

**Extensão agora:**
- Tenta encontrar conteúdo em: **DOMContentLoaded + 3s + 6s + 10s + 15s**
- Monitora DOM continuamente com MutationObserver
- Mostra logs detalhados no console
- Detecta problemas automaticamente

**Vozes PT-BR:**
```javascript
speechSynthesis.getVoices()
  .filter(v => v.lang.startsWith('pt'))
  .forEach(v => console.log(v.name, v.lang))
```

**Se quiser resetar tudo:**
1. Vá em `chrome://extensions/`
2. Clique "Remover"
3. Depois "Carregar sem compactação" novamente

---

**Próxima sessão:** Leia este arquivo + DESENVOLVIMENTO.md para contexto

## Atualização 2026-06-14

- A extensão agora injeta em `http://*/*` e `https://*/*`.
- Se o player não aparecer, confirme se a página não é `chrome://`, Chrome Web Store, PDF sem texto selecionável ou página protegida pelo navegador.
- A SuperVoz usa prefetch sequencial de até 3 blocos. Se houver pausa, veja no console logs `[Leitor]` relacionados a `prefetch SuperVoz`.

## Atualização 2026-06-15 — HTTP 401 no Modal

Quando o popup mostra token mascarado, por exemplo:

```text
Token a969...32
Último erro HTTP 401
```

e os logs do Modal mostram:

```text
Auth GET /health token=a969...32 expected=hf_N...37
Auth POST /tts token=a969...32 expected=hf_N...37
```

a extensão está enviando token. O erro é divergência entre o token salvo/carregado na extensão e o valor real do secret `API_AUTH_TOKEN` ativo no Modal.

Correção:

1. No site do Modal, abra o secret `supervoz-f5-secrets`.
2. Atualize `API_AUTH_TOKEN` para o mesmo valor usado em `supervoz-secrets.js`/popup.
3. Faça redeploy do app Modal:

```bash
cd SuperVoz-F5-Space
modal deploy modal_app.py
```

O valor correto é o token completo, não apenas o prefixo exibido no diagnóstico. O prefixo/tamanho servem apenas para comparar sem expor segredo.
