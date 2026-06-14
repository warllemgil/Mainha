# Leitor Estácio — Instruções de Instalação

## O que a extensão faz
- Aparece como um player flutuante em todas as páginas da Estácio
- Botão ▶ lê todo o texto da página de cima para baixo
- Destaca o parágrafo sendo lido e rola a tela automaticamente
- Botão ■ para a leitura
- Botão de velocidade: clique para ciclar entre 0.8× / 1.0× / 1.2× / 1.5× / 1.8× / 2.0×
- O player pode ser arrastado para qualquer posição na tela

## Como instalar no Chrome

1. Baixe e descompacte a pasta `estacio-leitor`

2. Abra o Chrome e acesse:
   chrome://extensions/

3. Ative o "Modo do desenvolvedor" (toggle no canto superior direito)

4. Clique em "Carregar sem compactação"

5. Selecione a pasta `estacio-leitor`

6. A extensão está instalada — acesse qualquer aula da Estácio e o player aparecerá no canto inferior direito

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

## Trocar a voz depois de treinar a sua
Quando seu modelo TTS estiver pronto, você pode criar uma API local
(Python + FastAPI) que recebe texto e retorna áudio, e substituir
o speechSynthesis no content.js por chamadas para essa API.
