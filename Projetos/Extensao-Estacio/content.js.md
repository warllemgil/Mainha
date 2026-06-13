# content.js — Script Principal de Leitura

**Última atualização:** 2026-06-12
**Linhas:** ~540

## Alteração 2026-06-12 — SuperVoz F5

O arquivo agora suporta dois motores de voz:

- `native`: usa `speechSynthesis` com voz nativa do navegador/Windows/Edge.
- `supervoz`: chama `https://warllem-supervoz-f5-api.hf.space/tts`, recebe `audio/wav` como `Blob` e toca com `new Audio(url)`.

As configurações vêm de `chrome.storage.local`:

- `leitorTtsProvider`: `native` ou `supervoz`.
- `leitorSupervozApiUrl`: URL base da API SuperVoz. Padrao: `https://warllem-supervoz-f5-api.hf.space`.
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
- Enquanto um bloco SuperVoz começa a tocar, a extensão tenta pré-carregar o próximo bloco em segundo plano.

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
✅ Cache em memória e pré-carregamento do próximo bloco para reduzir esperas repetidas.

## Próximas Etapas

1. Testar em página com iframe bloqueado (conteudo.ensineme.com.br)
2. Verificar se postMessage consegue extrair conteúdo
3. Se postMessage não funcionar → implementar fetch via background.js
4. Validar síntese de voz nos blocos extraídos

