# Leitor Estácio — Instruções de Instalação

## O que a extensão faz
- Aparece como um player flutuante em páginas HTTP/HTTPS comuns
- Botão ▶ lê todo o texto da página de cima para baixo
- Destaca o parágrafo sendo lido e rola a tela automaticamente
- Botão ■ para a leitura
- Botão de velocidade: clique para ciclar entre 0.8× / 1.0× / 1.2× / 1.5× / 1.8× / 2.0×
- O player pode ser arrastado para qualquer posição na tela
- Pode usar voz nativa do navegador ou SuperVoz F5; o endpoint Modal já vem configurado

## Como instalar no Chrome

1. Baixe e descompacte a pasta `estacio-leitor`

2. Abra o Chrome e acesse:
   chrome://extensions/

3. Ative o "Modo do desenvolvedor" (toggle no canto superior direito)

4. Clique em "Carregar sem compactação"

5. Selecione a pasta `estacio-leitor`

6. A extensão está instalada — acesse uma página HTTP/HTTPS e o player aparecerá no canto inferior direito

## Limitações

- O Chrome não permite content scripts em `chrome://`, Chrome Web Store e algumas páginas internas/protegidas.
- PDFs sem camada de texto, canvas e imagens ainda exigiriam OCR; a extensão lê texto disponível no DOM.

## Importante: ícone
Você precisa de um arquivo `icon.png` (48x48 pixels) na pasta.
Pode usar qualquer imagem PNG pequena renomeada para `icon.png`.
Sem ele o Chrome pode reclamar mas a extensão ainda funciona.

## Sobre a voz
A extensão usa a Web Speech API do próprio Chrome, que inclui a voz
"Francisca" (Microsoft, PT-BR neural) se ela estiver instalada no Windows.

Para verificar quais vozes você tem:
- Abra o console do Chrome (F12)
- Digite: speechSynthesis.getVoices().filter(v => v.lang.startsWith('pt'))
- Você verá a lista de vozes disponíveis

## Usar a voz treinada

No popup, a extensão já vem em `SuperVoz F5` com URL Modal. O token local é carregado de `supervoz-secrets.js` quando preenchido neste ambiente. O padrão atual usa `balanced` com `nfe_step=32` e faz prefetch sequencial de até 3 blocos seguintes durante a leitura.

Se aparecer `HTTP 401` ao testar conexão, recarregue a extensão e abra o popup de novo. A versão `1.4.1` remove `Bearer` duplicado e, quando `supervoz-secrets.js` tem token local, substitui automaticamente tokens antigos/incorretos salvos no Chrome quando a URL é o Modal padrão.
