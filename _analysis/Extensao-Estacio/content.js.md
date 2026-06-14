# content.js — Script Principal de Leitura

**Última atualização:** 2026-05-19 (19/05/2026 - Nova estratégia iframe)
**Linhas:** ~850

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

## Próximas Etapas

1. Testar em página com iframe bloqueado (conteudo.ensineme.com.br)
2. Verificar se postMessage consegue extrair conteúdo
3. Se postMessage não funcionar → implementar fetch via background.js
4. Validar síntese de voz nos blocos extraídos

