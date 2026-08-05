#!/usr/bin/env node

/**
 * Script para iniciar frontend y backend con manejo automático de puertos
 * Uso: node scripts/start-dev.js
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { freePort } = require('./port-utils');

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
  log('🔄 Ejecutando migraciones TypeORM (tablas pacientes, observaciones clínicas, etc.)...', 'blue');
  try {
    execSync('npm run migration:run', {
      cwd: path.join(__dirname, '..', 'backend'),
      stdio: 'inherit',
    });
    log('✅ Migraciones aplicadas o ya estaban al día', 'green');
  } catch {
    log(
      '❌ Fallaron las migraciones (MySQL inaccesible o esquema incoherente). Corrija DB_* en .env.local y que MySQL esté activo.',
      'red'
    );
    log('   Manual: cd backend && npm run migration:run', 'yellow');
    process.exit(1);
  }
}

function main() {
  log('🚀 Iniciando NurseHelper (Frontend + Backend)', 'cyan');
  log('');

  log('🔍 Verificando puertos...', 'blue');
  freePort(3000, log);
  freePort(4200, log);
  log('');

  checkDependencies();
  log('');

  runMigrations();
  log('');

  log('🚀 Iniciando servicios...', 'green');
  log('');

  const repoRoot = path.join(__dirname, '..');
  const concurrentlyBin = path.join(
    repoRoot,
    'node_modules',
    'concurrently',
    'dist',
    'bin',
    'concurrently.js',
  );
  if (!fs.existsSync(concurrentlyBin)) {
    log('❌ No se encontró concurrently. En la raíz del repo ejecuta: npm install', 'red');
    process.exit(1);
  }

  const devProcess = spawn(process.execPath, [
    concurrentlyBin,
    '-n', '🔷 BACKEND,🟡 FRONTEND',
    '-c', 'cyan,yellow',
    '--kill-others-on-fail',
    '--restart-tries', '3',
    '--restart-after', '2000',
    'npm run start:backend',
    'npm run start:frontend',
  ], {
    cwd: repoRoot,
    stdio: 'inherit',
    shell: false,
  });

  devProcess.on('error', (err) => {
    log(`❌ No se pudo iniciar los servicios: ${err.message}`, 'red');
    process.exit(1);
  });

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
