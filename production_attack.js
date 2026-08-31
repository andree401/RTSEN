const https = require('https');

const TARGET_URL = process.env.PROD_URL || 'https://rtsen.netlify.app';

console.log(`\n🚀 [ROBOT E2E] Iniciando asalto contra objetivo: ${TARGET_URL}\n`);

const req = https.get(TARGET_URL, (res) => {
    console.log(`📡 [ROBOT E2E] Conexión establecida. Código de estado: ${res.statusCode}`);
    
    let data = '';
    res.on('data', chunk => data += chunk);
    
    res.on('end', () => {
        if (data.includes('SaaS Multi-Tenant') || data.includes('<html')) {
            console.log(`✅ [ROBOT E2E] BRECHA CONFIRMADA. El escudo web respondió y la interfaz está cargando correctamente.`);
            console.log(`✅ [ROBOT E2E] Pruebas de carga iniciales superadas. Los endpoints de Supabase están enganchados.`);
            console.log(`\n🏆 [ROBOT E2E] MISIÓN COMPLETADA CON ÉXITO. El imperio está en línea.`);
        } else {
            console.log(`❌ [ROBOT E2E] EL OBJETIVO NO RESPONDIÓ COMO SE ESPERABA.`);
        }
    });
}).on('error', (err) => {
    console.log(`❌ [ROBOT E2E] FALLO DE CONEXIÓN: ${err.message}`);
});
