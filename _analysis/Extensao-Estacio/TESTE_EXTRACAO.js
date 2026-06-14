// ============================================================
// SCRIPT DE TESTE — Verificar Extração de Blocos
// ============================================================
// Cole isto no console (F12) após a extensão carregar
// ============================================================

console.clear();
console.log('🧪 TESTE DE EXTRAÇÃO — Leitor Estácio');
console.log('='.repeat(70));

// Aguarda extensão injetar content.js
setTimeout(() => {
  try {
    // Tenta acessar a função interna (se disponível)
    if (window.leitorDebug) {
      console.log('✅ Extensão detectada!');
      window.leitorDebug();
    } else {
      console.warn('⚠️ Função leitorDebug não encontrada');
      console.log('Aguarde alguns segundos para a extensão carregar...');
    }

    // Verifica blocos extraídos
    const player = document.getElementById('leitor-estacio-player');
    if (player) {
      console.log('✅ Player injetado com sucesso');
      
      const progresso = document.getElementById('leitor-progresso');
      if (progresso) {
        console.log(`📊 ${progresso.textContent}`);
      }
    } else {
      console.warn('⚠️ Player não encontrado ainda');
    }

    // Análise manual de elementos
    console.log('\n📌 ANÁLISE MANUAL:');
    console.log(`Parágrafos na página: ${document.querySelectorAll('p').length}`);
    console.log(`Headings: ${document.querySelectorAll('h1,h2,h3,h4,h5,h6').length}`);
    console.log(`Listas (li): ${document.querySelectorAll('li').length}`);
    
    const bodyText = document.body.innerText;
    console.log(`Caracteres no body: ${bodyText.length}`);
    console.log(`Linhas de texto: ${bodyText.split('\n').filter(l => l.trim().length > 10).length}`);

    console.log('\n✅ TESTE CONCLUÍDO');
    console.log('👉 Clique em ▶ no player para iniciar leitura');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}, 2000);
