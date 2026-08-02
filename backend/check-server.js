#!/usr/bin/env node

const http = require('http');

const checkPort = (port, name) => {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`✅ ${name} está corriendo en puerto ${port}`);
        console.log(`   Respuesta: ${data}`);
        resolve(true);
      });
    });

    req.on('error', (err) => {
      if (err.code === 'ECONNREFUSED') {
        console.log(`❌ ${name} NO está corriendo en puerto ${port}`);
        console.log(`   Error: ${err.message}`);
      } else {
        console.log(`⚠️  Error al conectar con ${name}: ${err.message}`);
      }
      resolve(false);
    });

    req.setTimeout(3000, () => {
      req.destroy();
      console.log(`⏱️  Timeout al conectar con ${name} en puerto ${port}`);
      resolve(false);
    });
  });
};

async function main() {
  console.log('🔍 Verificando servidores...\n');
  
  const backendRunning = await checkPort(3000, 'Backend');
  const frontendRunning = await checkPort(4200, 'Frontend');
  
  console.log('\n📋 Resumen:');
  console.log(`   Backend:  ${backendRunning ? '✅ Corriendo' : '❌ No está corriendo'}`);
  console.log(`   Frontend: ${frontendRunning ? '✅ Corriendo' : '❌ No está corriendo'}`);
  
  if (!backendRunning) {
    console.log('\n💡 Para iniciar el backend:');
    console.log('   cd backend && npm run dev');
  }
  
  if (!frontendRunning) {
    console.log('\n💡 Para iniciar el frontend:');
    console.log('   cd frontend && npm start');
  }
}

main();
