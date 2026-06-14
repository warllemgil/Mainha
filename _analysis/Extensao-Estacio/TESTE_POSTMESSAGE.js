// ============================================================
// SCRIPT DE TESTE — postMessage Strategy
// ============================================================
// Cole isto no console (F12) APÓS clicar em ▶ no player
// ============================================================

console.clear();
console.log('🧪 TESTE DE postMessage STRATEGY');
console.log('='.repeat(70));

setTimeout(() => {
  console.log('\n📊 ANÁLISE:');
  
  // 1. Verifica player
  const player = document.getElementById('leitor-estacio-player');
  console.log(`✅ Player existe? ${player ? 'SIM' : 'NÃO'}`);
  
  // 2. Verifica iframes
  const iframes = document.querySelectorAll('iframe');
  console.log(`✅ Total iframes: ${iframes.length}`);
  
  iframes.forEach((iframe, idx) => {
    console.log(`   [${idx + 1}] src: ${iframe.src.substring(0, 60)}`);
  });
  
  // 3. Procura por mensagens de log (no histórico do console)
  console.log('\n📨 VERIFICAR MANUALMENTE no console:');
  console.log('   └─ Procure por:');
  console.log('      ✅ "[Leitor] 🔍 Detectando iframes"');
  console.log('      ✅ "[Leitor] 📨 Iframe #1:"');
  console.log('      ✅ "[Leitor] 📤 postMessage enviado"');
  console.log('      ✅ "[Leitor] 📩 Conteúdo recebido do iframe" ← CRITICAL');
  
  // 4. Verifica status do player
  const statusEl = document.getElementById('leitor-status');
  const progressoEl = document.getElementById('leitor-progresso');
  
  if (statusEl) {
    console.log(`\n🎙️  Status atual: "${statusEl.textContent}"`);
  }
  
  if (progressoEl) {
    console.log(`📊 Progresso: ${progressoEl.textContent}`);
  }
  
  // 5. Instruções finais
  console.log('\n👉 SE QUER MAIS DETALHE:');
  console.log('   - Abra Dev Tools (F12)');
  console.log('   - Vá para aba "Console"');
  console.log('   - Procure por "[Leitor]" nos logs');
  console.log('   - Veja se há "[Leitor] 📩 Conteúdo recebido"');
  console.log('\n👉 REPORTE:');
  console.log('   1. Quantos blocos estão sendo lidos? (veja em "X / Y blocos")');
  console.log('   2. Apareceu erro no console?');
  console.log('   3. Qual é o último log [Leitor] que aparece?');
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ TESTE CONCLUÍDO');

}, 500);
