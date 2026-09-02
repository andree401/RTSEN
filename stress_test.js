/* eslint-disable @typescript-eslint/no-require-imports */
const http = require('http');

const TARGET_URL = 'http://localhost:3000/api/chat';
const TOTAL_REQUESTS = 5000;
const BATCH_SIZE = 500;

let successCount = 0;
let failCount = 0;
let timeoutCount = 0;

// Configurar para permitir muchas conexiones concurrentes
http.globalAgent.maxSockets = 5000;

console.log(`[Destruction QA] Iniciando ataque DDoS simulado...`);
console.log(`Objetivo: ${TARGET_URL}`);
console.log(`Total de peticiones: ${TOTAL_REQUESTS}`);

const startTime = Date.now();

function fireRequest(id) {
    return new Promise((resolve) => {
        const req = http.request(TARGET_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            timeout: 8000 // 8 segundos de timeout
        }, (res) => {
            res.resume(); // Consumir los datos
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    successCount++;
                } else {
                    failCount++;
                }
                resolve();
            });
        });

        req.on('error', (err) => {
            if (err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT') {
                timeoutCount++;
            } else {
                failCount++;
            }
            resolve();
        });

        req.on('timeout', () => {
            timeoutCount++;
            req.destroy();
        });

        req.write(JSON.stringify({ message: `DDoS Ping ${id}` }));
        req.end();
    });
}

async function runAttack() {
    let completed = 0;
    
    for (let i = 0; i < TOTAL_REQUESTS; i += BATCH_SIZE) {
        const batchSize = Math.min(BATCH_SIZE, TOTAL_REQUESTS - i);
        const promises = [];
        
        for (let j = 0; j < batchSize; j++) {
            promises.push(fireRequest(i + j));
        }
        
        await Promise.all(promises);
        completed += batchSize;
        process.stdout.write(`Progreso: ${completed}/${TOTAL_REQUESTS} peticiones\r`);
    }

    const duration = (Date.now() - startTime) / 1000;
    
    console.log('\n\n===========================================');
    console.log('       REPORTE DE ESTRÉS (QA DESTRUCTIVO)  ');
    console.log('===========================================');
    console.log(`Tiempo de ejecución : ${duration.toFixed(2)} segundos`);
    console.log(`RPS (Req/Sec)       : ${(TOTAL_REQUESTS / duration).toFixed(2)}`);
    console.log('-------------------------------------------');
    console.log(`✅ Éxitos (200 OK)   : ${successCount}`);
    console.log(`❌ Fallos/Rechazos   : ${failCount}`);
    console.log(`⏱️  Timeouts          : ${timeoutCount}`);
    console.log('===========================================');
    
    if (successCount === TOTAL_REQUESTS) {
        console.log('\n[Resultado]: Excelente. El servidor soportó toda la carga.');
    } else if (successCount > TOTAL_REQUESTS * 0.8) {
        console.log('\n[Resultado]: Bueno, pero hubo caídas bajo estrés pesado.');
    } else {
        console.log('\n[Resultado]: CRÍTICO. El servidor colapsó bajo el ataque.');
    }
}

runAttack();
