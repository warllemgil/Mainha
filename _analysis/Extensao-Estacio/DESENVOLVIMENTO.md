# DESENVOLVIMENTO — Leitor Estácio

**Atualizado:** 21/05/2026
**Versão:** 1.3.0

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

---

## 2) ARQUIVOS CHAVE

### `content.js`
- Gerencia o estado global (`blocos`, `indiceAtual`, `lendo`).
- Implementa tanto o "Modo Pai" quanto o "Modo Iframe".
- Comunicação bidirecional via `postMessage`.

### `manifest.json`
- Configurado com `all_frames: true` para injetar o script em todos os subframes.
- Permissões para os domínios da Estácio e servidores de conteúdo (`ensineme.com.br`).

---

## 3) RESOLVIDO (21/05/2026)

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
2. Acesse uma aula da Estácio.
3. Clique em ▶ e verifique se o texto fica azul e a página rola sozinha.
4. Navegue para a próxima página de conteúdo e verifique se o contador reseta e o novo conteúdo é lido corretamente.