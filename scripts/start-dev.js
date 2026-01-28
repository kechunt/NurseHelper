#!/usr/bin/env node

/**
 * Script para iniciar frontend y backend con manejo automático de puertos
 * Uso: node scripts/start-dev.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function freePort(port) {
  try {
    const pids = execSync(`lsof -ti:${port}`, { encoding: 'utf8', stdio: 'pipe' }).trim();
    if (pids) {
      log(`⚠️  Puerto ${port} está en uso. Liberando...`, 'yellow');
      try {
        execSync(`kill -9 ${pids}`, { stdio: 'pipe' });
        // Esperar un momento para que el puerto se libere
        execSync('sleep 1', { stdio: 'pipe' });
        
        // Verificar que se liberó
        try {
          execSync(`lsof -ti:${port}`, { stdio: 'pipe' });
          log(`❌ No se pudo liberar el puerto ${port}`, 'red');
          return false;
        } catch {
          log(`✅ Puerto ${port} liberado`, 'green');
          return true;
        }
      } catch (error) {
        log(`⚠️  Error al liberar puerto ${port}: ${error.message}`, 'yellow');
        return false;
      }
    } else {
      log(`✅ Puerto ${port} está libre`, 'green');
      return true;
    }
  } catch (error) {
    // Si lsof no encuentra procesos, el puerto está libre
    log(`✅ Puerto ${port} está libre`, 'green');
    return true;
  }
}

function checkDependencies() {
  log('🔍 Verificando dependencias...', 'blue');
  
  const backendNodeModules = path.join(__dirname, '..', 'backend', 'node_modules');
  const frontendNodeModules = path.join(__dirname, '..', 'frontend', 'node_modules');
  
  if (!fs.existsSync(backendNodeModules)) {
    log('⚠️  Instalando dependencias del backend...', 'yellow');
    execSync('npm install', { cwd: path.join(__dirname, '..', 'backend'), stdio: 'inherit' });
  }
  
  if (!fs.existsSync(frontendNodeModules)) {
    log('⚠️  Instalando dependencias del frontend...', 'yellow');
    execSync('npm install', { cwd: path.join(__dirname, '..', 'frontend'), stdio: 'inherit' });
  }
  
  log('✅ Dependencias verificadas', 'green');
}

function runMigrations() {
  log('🔄 Verificando migraciones pendientes...', 'blue');
  try {
    const result = execSync('npm run migration:run', {
      cwd: path.join(__dirname, '..', 'backend'),
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    if (result.includes('No migrations') || result.includes('already executed')) {
      log('✅ No hay migraciones pendientes', 'green');
    } else {
      log('✅ Migraciones ejecutadas', 'green');
    }
  } catch (error) {
    // Si hay error, puede ser que no haya migraciones o que haya un problema
    // Continuamos de todas formas
    log('⚠️  No se pudieron ejecutar migraciones (puede ser normal)', 'yellow');
  }
}

// Función principal
function main() {
  log('🚀 Iniciando NurseHelper (Frontend + Backend)', 'cyan');
  log('');
  
  // Liberar puertos
  log('🔍 Verificando puertos...', 'blue');
  freePort(3000);
  freePort(4200);
  log('');
  
  // Verificar dependencias
  checkDependencies();
  log('');
  
  // Ejecutar migraciones
  runMigrations();
  log('');
  
  // Iniciar servicios
  log('🚀 Iniciando servicios...', 'green');
  log('');
  
  // Ejecutar directamente concurrently para evitar bucle infinito
  // Usar npx para asegurar que concurrently esté disponible
  const devProcess = spawn('npx', [
    'concurrently',
    '-n', '🔷 BACKEND,🟡 FRONTEND',
    '-c', 'cyan,yellow',
    '--kill-others-on-fail',
    '--restart-tries', '3',
    '--restart-after', '2000',
    'npm run start:backend',
    'npm run start:frontend'
  ], {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    shell: false
  });
  
  // Manejar señales de terminación
  process.on('SIGINT', () => {
    log('\n🛑 Deteniendo servicios...', 'yellow');
    devProcess.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    log('\n🛑 Deteniendo servicios...', 'yellow');
    devProcess.kill('SIGTERM');
    process.exit(0);
  });
  
  devProcess.on('exit', (code) => {
    process.exit(code || 0);
  });
}

main();
