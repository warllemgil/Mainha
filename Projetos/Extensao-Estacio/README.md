# 🔊 Leitor Estácio — v1.4.2

Extensão Chrome que lê páginas HTTP/HTTPS em voz alta com voz nativa do navegador ou SuperVoz F5.

## ✨ Principais Correções (v1.4)

- ✅ **v1.4.2: Auth e diagnóstico SuperVoz** — O popup mostra diagnóstico de backend, token, motor, endpoint, `/health` e último erro. O fallback para voz nativa só ocorre se a opção manual estiver ativada.
- ✅ **Custo Modal reduzido** — A pré-geração de blocos fica desligada por padrão. O botão Stop aborta chamadas pendentes no navegador, mas uma inferência já recebida pelo Modal pode terminar no servidor; por isso o backend foi ajustado para encerrar o container após poucos segundos ocioso.
- ✅ **Header confirmado** — O backend Modal usa `Authorization: Bearer <API_AUTH_TOKEN>` como padrão e também aceita `X-API-Token`/`x-api-key` como compatibilidade. As rotas reais são `GET /health`, `GET /voices` e `POST /tts`; `/synthesize`, `/api/tts` e `/generate` não existem e retornam `404`.
- ✅ **v1.4.1: SuperVoz pronta para uso local** — A extensão agora usa SuperVoz como padrão, carrega `supervoz-secrets.js` antes de `content.js`/`popup.js` e migra automaticamente a URL antiga do Hugging Face Space que retorna `404`.
- ✅ **Correção de HTTP 401** — A extensão normaliza tokens salvos no Chrome e remove prefixo `Bearer` duplicado. Quando `supervoz-secrets.js` tem token local preenchido e a URL é o Modal padrão, esse token local sobrescreve valores antigos/incorretos.
- ✅ **Leitura em sites gerais** — O player agora é injetado em páginas `http://*/*` e `https://*/*`, não apenas em domínios da Estácio.
- ✅ **SuperVoz Modal como padrão** — A URL padrão da API é `https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run`.
- ✅ **Qualidade SuperVoz ajustada** — O padrão passou para `balanced` com `nfe_step=32`.
- ✅ **Prefetch sequencial** — Durante a leitura, a extensão tenta manter até 3 blocos seguintes no cache, um por vez.
- ✅ **Proteção de custo** — O prefetch é abortado ao parar a leitura, trocar de rota ou fechar a página.
- ✅ **Normalização de áudio no servidor** — O backend reduz pico excessivo para evitar clipping perceptível.

## ✨ Principais Correções (v1.3)

- ✅ **SuperVoz F5 opcional** — Pode usar API configurável no popup.
- ✅ **Fallback seguro** — Se a SuperVoz falhar, usa a voz nativa do navegador.
- ✅ **Configuração no popup** — Salva motor de voz, URL/token, modo e `nfe_step` em `chrome.storage.local`; os valores padrão já vêm preenchidos.
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
Já existe integração com a API SuperVoz F5. A extensão vem apontada para o Modal GPU, `balanced` e `nfe_step=32`. O token padrão local é lido de `supervoz-secrets.js`, carregado antes do popup e do content script. O popup continua permitindo trocar URL/token se o endpoint mudar.

Se o teste de conexão ou player mostrava `HTTP 401`, a causa provável era token ausente/incorreto no request específico. Agora `GET /health` e `POST /tts` usam funções centralizadas que enviam os mesmos headers de autenticação e os mesmos logs seguros.

Para gerar secrets por build/local:

```bash
cd Projetos/Extensao-Estacio
MAINHA_BACKEND_URL="https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run" \
MAINHA_ASSISTANT_TOKEN="SEU_API_AUTH_TOKEN" \
node scripts/build-supervoz-secrets.js
```

Para editar manualmente, mantenha a URL padrao e preencha apenas `apiToken` com `API_AUTH_TOKEN`, sem prefixo `Bearer`. A extensao limpa aspas extras acidentais na URL e no token.

Por padrão, a extensão não faz prefetch. Se a opção avançada "Pré-gerar próximo bloco" for ativada, ela pode gerar áudio que talvez não seja ouvido se você parar logo depois. O botão `Testar conexão` chama `/health`; use apenas quando precisar conferir a configuração, porque no deploy Modal atual qualquer rota acorda o container GPU.

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
