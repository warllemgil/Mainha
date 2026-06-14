# player.css — Estilo do Player Flutuante

**Última atualização:** 2026-05-19
**Linhas:** 187

## Posicionamento
```css
position: fixed;
bottom: 28px;
right: 28px;
z-index: 2147483647;  /* Máximo z-index válido */
```

## Componentes Principais

### `.leitor-estacio-player` (Container)
- Cor: `#1e1e2e` (dark)
- Padding: `8px`
- Borda arredondada: `border-radius: 12px`
- Sombra: `box-shadow: 0 10px 40px rgba(0,0,0,0.3)`

### `.leitor-botoes` (Grupo de botões)
- Flex layout com gap
- Wraps responsivo

### `.leitor-botao` (Individual)
- Tamanho: `44px × 44px`
- Transição smooth
- Hover: aumenta brilho

### `.leitor-barra-progresso`
- Gradiente azul-roxo
- Altura: `4px`
- Width: dinâmica com JS

### `.leitor-paragrafo-ativo` (Destaque de leitura)
- Borda esquerda azul: `4px solid #3498db`
- Background suave: `rgba(52, 152, 219, 0.1)`
- Transição: `0.3s ease`

## Status de Teste
✅ Estilos funcionando
✅ Responsividade OK
⚠️ Z-index pode conflitar com modais da página

## Próximas Melhorias
- [ ] Suporte a tema escuro/claro
- [ ] Animação de progresso mais suave
- [ ] Ícones melhorados (SVG inline)
