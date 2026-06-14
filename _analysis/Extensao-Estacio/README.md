# 🔊 Leitor Estácio — v1.2

Extensão Chrome que lê automaticamente o conteúdo de aulas da Estácio em voz alta com suporte completo a vozes em português.

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
- Acesse qualquer página da Estácio
- O player flutuante aparecerá no **canto inferior direito**
- Clique no ícone da extensão para ver o painel de controle

## 📖 Como Usar

| Ação | O que faz |
|------|-----------|
| **▶ (Play)** | Inicia ou retoma a leitura |
| **⏸ (Pause)** | Pausa a leitura |
| **■ (Stop)** | Para tudo e volta ao início |
| **1.0× (Velocidade)** | Clique para ciclar: 0.8× → 1.0× → 1.2× → 1.5× → 1.8× → 2.0× |
| **Arrastar** | Segure o player e arraste para mover |

## 🎯 O que a Extensão Faz

✅ **Extrai todo o texto** da página (títulos, parágrafos, listas, tabelas, etc.)
✅ **Lê em voz alta** usando vozes nativas do Windows em português
✅ **Destaca o texto** sendo lido em tempo real
✅ **Rola automaticamente** para o texto atual
✅ **Mostra progresso** com barra de carregamento
✅ **Funciona com SPAs** (aguarda conteúdo carregado dinamicamente)

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
Se quiser usar seu próprio modelo de voz (Python + FastAPI), veja os comentários no `content.js` (linhas 140-170) para saber onde injetar.

## 🐛 Troubleshooting

### Player não aparece
- Recarregue a página (Ctrl+R)
- Verifique se está em `estacio.br`, `estacioprd.net` ou `stecine.azureedge.net`
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

## 🔐 Permissões Usadas

- **activeTab** — Ler conteúdo da aba atual
- **scripting** — Injetar scripts (content.js)
- **storage** — Guardar preferências
- **offscreen** — Suporte futuro para background audio

## 📞 Suporte

Se encontrar problemas:
1. Abra Console (F12) e procure erros
2. Teste em outra página da Estácio
3. Tente desinstalar e reinstalar a extensão
4. Reinicie o Chrome

## 📝 Licença

Uso pessoal. Modificar e distribuir livremente.

---

**Versão:** 1.2  
**Testado em:** Chrome 120+  
**Último update:** Maio 2026
