# 🎮 Guia dos Botões — v1.2.2

## Player Flutuante com Novos Botões

```
┌─────────────────────────────────────────────┐
│ ▶  [Status / Progresso / Barra]  ⏮ ⏭ 1.0× 🔄 ■ │
└─────────────────────────────────────────────┘
```

### Cada Botão Faz O Quê:

| Botão | Nome | O que faz | Quando usar |
|-------|------|----------|------------|
| **▶** | Play/Pausa | Inicia ou pausa a leitura | Começar a ouvir ou pausar |
| **⏮** | Anterior | Volta para o bloco anterior | Perdeu algo ou quer repetir |
| **⏭** | Próximo | Pula para o próximo bloco | Quer pular um bloco/parágrafo |
| **1.0×** | Velocidade | Muda a velocidade de leitura | Aumentar/diminuir velocidade |
| **🔄** | Recarregar | Procura por novo conteúdo | Clicou em uma matéria e não atualizou |
| **■** | Parar | Para tudo e volta ao início | Terminar a leitura |

## 🆕 Nova Feature: Detecção Automática de Página

Quando você clica em uma **matéria diferente** na Estácio:
- A extensão detecta automaticamente que mudou de página
- Espera 1 segundo pela página renderizar
- Recarrega o conteúdo automaticamente
- Se estava lendo, retoma com o novo conteúdo

**Exemplo:**
1. Está ouvindo uma matéria
2. Clica em outra matéria (URL muda)
3. A extensão para, detecta mudança
4. Recarrega blocos da nova matéria
5. Retoma leitura (se estava lendo)

## 🎯 Fluxo Recomendado

### Primeira Vez Acessando uma Matéria:
1. Abra uma matéria da Estácio
2. Aguarde 3-5 segundos
3. Clique ▶ para começar
4. Use ⏭ para pular blocos ou ⏮ para voltar

### Mudou de Matéria:
1. Clique em outra matéria
2. **Automático:** Extensão recarrega
3. Clique ▶ novamente

### Se Conteúdo Não Atualizou:
1. Clique manualmente no botão 🔄
2. Aguarde 2 segundos
3. Clique ▶

## 📊 Estatísticas de Teste

- **Encontrou:** 4 blocos (página inicial da Estácio)
- **Leu:** Conteúdo correto
- **Problema:** Mudança de matéria (agora corrigido em v1.2.2)

## 🧪 Próximo Teste

1. Recarregue a extensão (chrome://extensions → 🔄)
2. Acesse uma **matéria na Estácio** (não página inicial)
3. Espere 5 segundos
4. Clique ▶ para ouvir
5. Se funcionar, teste clicar em outra matéria

---

**Versão:** 1.2.2  
**Status:** Com navegação e detecção automática de página
