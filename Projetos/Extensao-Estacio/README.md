# 🔊 Leitor Estácio — v1.4

Extensão Chrome que lê páginas HTTP/HTTPS em voz alta com voz nativa do navegador ou SuperVoz F5.

## ✨ Principais Correções (v1.4)

- ✅ **Leitura em sites gerais** — O player agora é injetado em páginas `http://*/*` e `https://*/*`, não apenas em domínios da Estácio.
- ✅ **SuperVoz Modal como padrão** — A URL padrão da API é `https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run`.
- ✅ **Qualidade SuperVoz ajustada** — O padrão passou para `balanced` com `nfe_step=32`.
- ✅ **Prefetch sequencial** — Durante a leitura, a extensão tenta manter até 3 blocos seguintes no cache, um por vez.
- ✅ **Proteção de custo** — O prefetch é abortado ao parar a leitura, trocar de rota ou fechar a página.
- ✅ **Normalização de áudio no servidor** — O backend reduz pico excessivo para evitar clipping perceptível.

## ✨ Principais Correções (v1.3)

- ✅ **SuperVoz F5 opcional** — Pode usar API configurável no popup.
- ✅ **Fallback seguro** — Se a SuperVoz falhar ou não houver `HF_TOKEN`, usa a voz nativa do navegador.
- ✅ **Configuração no popup** — Salva motor de voz, `HF_TOKEN`, modo e `nfe_step` em `chrome.storage.local`.
- ✅ **URL SuperVoz configurável** — Permite apontar para o Hugging Face Space ou para o novo endpoint Modal GPU.
- ✅ **Token fora do código** — O token não fica hardcoded nos arquivos da extensão.
- ✅ **Permissão do Space** — `manifest.json` agora permite chamadas ao Hugging Face Space.

## ✨ Principais Correções (v1.2)

- ✅ **Popup funcional** — Agora aparece um painel bonito ao clicar no ícone
- ✅ **Background Service Worker** — Gerencia a extensão corretamente
- ✅ **Detecção de conteúdo melhorada** — Aguarda até 8 segundos por conteúdo dinâmico
- ✅ **Monitoramento de DOM** — Detecta novos conteúdos inseridos dinamicamente
- ✅ **MV3 atualizado** — Manifest v3 com todas as permissões corretas
- ✅ **run_at: document_idle** — Executa quando a página está pronta

## 🚀 Como Instalar

### 1. Baixe a pasta `estacio-leitor`
Certifique-se que tem os seguintes arquivos:
```
estacio-leitor/
├── manifest.json
├── content.js
├── popup.html
├── popup.js
├── background.js
├── player.css
├── icon.png
├── INSTALAR.md
└── README.md
```

### 2. Abra o Chrome e ative modo desenvolvedor
- Abra: `chrome://extensions/`
- Ative **"Modo do desenvolvedor"** (canto superior direito)

### 3. Carregue a extensão
- Clique em **"Carregar extensão sem compactação"**
- Selecione a pasta `estacio-leitor`

### 4. Pronto! 🎉
- Acesse uma página HTTP/HTTPS comum
- O player flutuante aparecerá no **canto inferior direito**
- Clique no ícone da extensão para ver o painel de controle

## 📖 Como Usar

| Ação | O que faz |
|------|-----------|
| **▶ (Play)** | Inicia ou retoma a leitura |
| **⏸ (Pause)** | Pausa a leitura |
| **■ (Stop)** | Para tudo e volta ao início |
| **1.0× (Velocidade)** | Clique para ciclar: 0.8× → 1.0× → 1.2× → 1.5× → 1.8× → 2.0× |
| **Nativa/SuperVoz** | Alterna entre voz do navegador e API SuperVoz F5 |
| **Arrastar** | Segure o player e arraste para mover |

## 🎯 O que a Extensão Faz

✅ **Extrai todo o texto** da página (títulos, parágrafos, listas, tabelas, etc.)
✅ **Lê em voz alta** usando vozes nativas do Windows em português
✅ **Destaca o texto** sendo lido em tempo real
✅ **Rola automaticamente** para o texto atual
✅ **Mostra progresso** com barra de carregamento
✅ **Funciona com SPAs** (aguarda conteúdo carregado dinamicamente)
✅ **Funciona em sites HTTP/HTTPS gerais**; páginas internas do Chrome, Chrome Web Store, PDFs sem camada de texto e conteúdos em canvas/imagem continuam fora do alcance normal.

## 🔧 Configuração Avançada

### Mudar a Voz
Abra o **Console do Chrome** (F12) e execute:
```javascript
speechSynthesis.getVoices()
  .filter(v => v.lang.startsWith('pt'))
  .forEach(v => console.log(v.name, v.lang))
```

Você verá vozes disponíveis como "Francisca (pt-BR)". O código já tenta usar Francisca automaticamente.

### Integrar com API TTS Customizada
Já existe integração com a API SuperVoz F5. No popup, escolha `SuperVoz F5`, informe a URL base da API no campo `URL da API SuperVoz` e o token Bearer, depois salve. O padrão atual é Modal GPU com `balanced` e `nfe_step=32`.

Para reduzir pausas, a extensão faz prefetch sequencial de até 3 blocos seguintes enquanto o áudio atual toca. Ela não dispara 3 inferências em paralelo; gera um bloco por vez para evitar múltiplos containers e gasto inesperado. O botão `Testar conexao` chama `/health`; use apenas quando precisar conferir a configuração.

## 🐛 Troubleshooting

### Player não aparece
- Recarregue a página (Ctrl+R)
- Verifique se a página é `http://` ou `https://`; páginas `chrome://`, Chrome Web Store e algumas páginas protegidas não permitem content scripts
- Abra Console (F12) e procure por erros em vermelho

### Botões não funcionam
- Chrome pode bloquear se o site tiver CSP forte
- Tente desativar outras extensões que também mexem em conteúdo
- Recarregue a página

### Voz não sai
- Windows precisa de vozes instaladas. Vá em:
  - Configurações → Acessibilidade → Fala
  - Baixe a voz "Francisca (pt-BR)" da Microsoft
- Verifique volume do computador
- Teste em outro site (ex: Google Tradutor)

### Player não carrega conteúdo
- Aguarde 8 segundos (a página pode estar carregando dinamicamente)
- Console (F12) mostra quanto foi detectado no status
- Se continuar vazio, o site pode estar bloqueando a extensão via CSP

## 📄 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `manifest.json` | Configuração da extensão (MV3) |
| `content.js` | Lógica principal: extrai texto e lê em voz alta |
| `popup.html` | Interface ao clicar no ícone |
| `popup.js` | Script do popup |
| `background.js` | Service worker (gerencia extensão) |
| `player.css` | Estilos do player flutuante |
| `icon.png` | Ícone (48×48 ou 128×128 px) |
| `config.json` | Modelo local de configuração sem chaves reais |

## 🔐 Permissões Usadas

- **activeTab** — Ler conteúdo da aba atual
- **scripting** — Injetar scripts (content.js)
- **storage** — Guardar preferências
- **offscreen** — Suporte futuro para background audio

## 📞 Suporte

Se encontrar problemas:
1. Abra Console (F12) e procure erros
2. Teste em outra página HTTP/HTTPS
3. Tente desinstalar e reinstalar a extensão
4. Reinicie o Chrome

## 📝 Licença

Uso pessoal. Modificar e distribuir livremente.

---

**Versão:** 1.4  
**Testado em:** Chrome 120+  
**Último update:** Junho 2026
