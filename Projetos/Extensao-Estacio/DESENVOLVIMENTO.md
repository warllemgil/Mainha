# DESENVOLVIMENTO — Leitor Estácio

**Atualizado:** 14/06/2026
**Versão:** 1.4.0

---

## 1) O QUE JÁ FUNCIONA

- **Player Flutuante:** Injetado no DOM com controles ▶/⏸, ⏮/⏭, velocidade (0.8x-2.0x), e Stop ■.
- **Extração Inteligente:** 4 estratégias em cascata (Seletiva → Fallback → Body → TreeWalker).
- **Suporte a Iframes (Cross-Origin):**
    - ✅ **Sincronização de Conteúdo:** O iframe extrai o texto e envia para a página pai via `postMessage`.
    - ✅ **Ponte de Destaque Visual:** A página pai avisa o iframe qual bloco está sendo lido.
    - ✅ **Auto-Scroll:** O iframe rola a tela automaticamente para manter o texto visível.
- **Síntese de Voz:** Web Speech API com prioridade para vozes de alta qualidade (Naturais/Online → Google → Locais).
- **Detecção de SPA:** Monitora mudanças de URL/Título e reseta o estado automaticamente para carregar o conteúdo da nova página.
- **Ferramenta de Debug:** Botão 🔍 que gera um mapa da estrutura da página e status da extração.
- **Sites gerais:** `manifest.json` injeta o player em páginas `http://*/*` e `https://*/*`, mantendo compatibilidade com Estácio/iframes.
- **SuperVoz F5:** modo Modal GPU como padrão, `balanced`, `nfe_step=32`, cache em memória e prefetch sequencial de até 3 blocos.

---

## 2) ARQUIVOS CHAVE

### `content.js`
- Gerencia o estado global (`blocos`, `indiceAtual`, `lendo`).
- Implementa tanto o "Modo Pai" quanto o "Modo Iframe".
- Comunicação bidirecional via `postMessage`.

### `manifest.json`
- Configurado com `all_frames: true` para injetar o script em todos os subframes.
- Permissões para páginas HTTP/HTTPS gerais e para endpoints SuperVoz/Hugging Face/Modal.

---

## 3) RESOLVIDO (21/05/2026)

### Problema: Extensão limitada aos domínios da Estácio
Em 14/06/2026, `manifest.json` passou a usar `http://*/*` e `https://*/*` em `content_scripts.matches` e `host_permissions`. A extensão agora aparece em sites HTTP/HTTPS comuns. Limitações de navegador permanecem para `chrome://`, Chrome Web Store, páginas protegidas, PDFs sem texto e conteúdo renderizado apenas em imagem/canvas.

### Problema: Pausas entre blocos SuperVoz
Em 14/06/2026, `content.js` passou a fazer prefetch sequencial de até 3 blocos seguintes. O Modal foi ajustado para `scaledown_window=60`, e o backend normaliza pico do WAV para reduzir clipping.

### Problema: Falta de destaque visual em iframes
Implementada a ponte de mensagens. Agora, quando o player (no pai) avança para o próximo bloco, ele envia o índice para o iframe. O iframe localiza o elemento original e aplica a classe `.leitor-paragrafo-ativo` e o `scrollIntoView`.

### Problema: Sincronização ao mudar de página
Melhorado o detector de rota SPA. Agora, ao detectar mudança de URL ou Título, a extensão:
1. Cancela qualquer áudio em execução.
2. Limpa todos os destaques visuais (no pai e nos iframes).
3. Zera o cache de blocos.
4. Realiza múltiplas tentativas (retries aos 1s, 3s e 6s) de solicitar o novo conteúdo dos iframes, garantindo que o SPA tenha tempo de renderizar o novo texto.

---

## 4) PENDENTE / PRÓXIMOS PASSOS

### OCR (Tesseract.js) ⬜
- Investigar se existem aulas onde o conteúdo é puramente gráfico (Canvas) sem camada de texto acessível.

### Polimento de Interface ⬜
- Adicionar animações suaves de transição no player.
- Melhorar o feedback visual quando o conteúdo está sendo buscado.

---

## 5) COMO TESTAR

1. Recarregue a extensão em `chrome://extensions`.
2. Acesse uma página HTTP/HTTPS comum ou uma aula da Estácio.
3. Clique em ▶ e verifique se o texto fica azul e a página rola sozinha.
4. Navegue para a próxima página de conteúdo e verifique se o contador reseta e o novo conteúdo é lido corretamente.
