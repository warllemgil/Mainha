# content.js — Script Principal de Leitura

**Última atualização:** 2026-06-14
**Linhas:** ~700

## Alteração 2026-06-14 — Leitura geral e buffer SuperVoz

- O script passou a ser injetado em páginas HTTP/HTTPS gerais via `manifest.json`.
- A URL padrão da SuperVoz agora é `https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run`.
- O padrão SuperVoz mudou para `balanced` com `nfe_step=32`, preservando melhor qualidade da voz treinada.
- O cache em memória continua com limite de 30 WAVs.
- O prefetch agora mantém até 3 blocos seguintes no cache (`SUPERVOZ_PREFETCH_AHEAD = 3`).
- O prefetch é sequencial: gera um bloco, aguarda terminar, depois gera o próximo. Isso evita múltiplas inferências paralelas e reduz risco de gasto inesperado no Modal.
- `abortarPrefetchSuperVoz()` cancela prefetch ao parar leitura, trocar rota ou sair da página.

## Alteração 2026-06-12 — SuperVoz F5

O arquivo agora suporta dois motores de voz:

- `native`: usa `speechSynthesis` com voz nativa do navegador/Windows/Edge.
- `supervoz`: chama a URL configurada em `leitorSupervozApiUrl`, recebe `audio/wav` como `Blob` e toca com `new Audio(url)`.

As configurações vêm de `chrome.storage.local`:

- `leitorTtsProvider`: `native` ou `supervoz`.
- `leitorSupervozApiUrl`: URL base da API SuperVoz. Padrao: `https://warllemedicao--supervoz-f5-gpu-fastapi-app.modal.run`.
- `leitorHfToken`: token usado no header `Authorization: Bearer ...`.
- `leitorSupervozMode`: `fast`, `balanced` ou `quality`.
- `leitorSupervozNfeStep`: valor numérico enviado ao servidor.

Se a SuperVoz falhar, se não houver token ou se o áudio não tocar, o código faz fallback automático para `speechSynthesis`.

## Alteração 2026-06-12 — Cache e Pré-carregamento

Foi adicionado cache em memória para áudios SuperVoz já gerados:

- `audioCache`: guarda até 30 WAVs como `Blob`.
- `audioFetchesEmAndamento`: evita duas chamadas simultâneas para o mesmo texto/configuração.
- A chave do cache considera texto, voz, velocidade, modo e `nfe_step`.
- Ao voltar para um bloco já gerado durante a mesma sessão da página, a extensão toca o áudio em cache sem chamar `/tts` novamente.
- O pré-carregamento automático foi reativado de forma controlada: até 3 blocos à frente, um por vez.

Limitação: esse cache é em memória. Ao recarregar a página ou reiniciar o navegador, os áudios precisam ser gerados de novo.

## Estratégia de Extração (v3 - Auto-Sync de Iframes bloqueados)

### Fluxo:
```
[Iframe (ensineme.com.br)]
    ├─ window.addEventListener('load') e setInterval(3000)
    ├─ Extrai blocos do próprio body (ignorando pais duplicados)
    └─ Envia postMessage({ type: 'leitor-estacio:content' }) para window.top

[Página Principal (estudante.estacio.br)]
    ├─ window.addEventListener('message')
    ├─ Salva blocos recebidos em iframeCache (sem expiração de tempo)
    └─ Ao clicar em [Iniciar Leitura]:
         ├─ Usa blocos do iframeCache, se existirem.
         └─ Fallback: Lê <main> ignorando menus (nav, aside, sidebar).
```

## Status Atualizado

✅ Extração de body e fallback seguros
✅ **Modo Iframe Auto-Sync finalizado com sucesso.** O iframe bloqueado envia dados para o cache da página principal ativamente.
✅ Problema de blocos repetidos corrigido (filtragem de elementos filhos).
✅ Seleção de Voz Neural priorizada (Edge Natural / Google Premium).
✅ SuperVoz F5 opcional com fallback para voz nativa.
✅ URL da API SuperVoz configurável para alternar entre Hugging Face Space e Modal GPU.
✅ Cache em memória para reaproveitar áudios já gerados na mesma sessão.
✅ Pré-carregamento sequencial de até 3 blocos para reduzir pausas sem disparar inferências paralelas.
✅ Injeção em sites HTTP/HTTPS gerais; a extração continua usando seletores semânticos, fallback de body e ponte de iframes.

## Próximas Etapas

1. Testar em página com iframe bloqueado (conteudo.ensineme.com.br)
2. Verificar se postMessage consegue extrair conteúdo
3. Se postMessage não funcionar → implementar fetch via background.js
4. Validar síntese de voz nos blocos extraídos

