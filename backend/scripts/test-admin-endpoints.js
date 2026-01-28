#!/usr/bin/env node

/**
 * Script para probar los endpoints del panel admin
 * Ejecutar: node backend/scripts/test-admin-endpoints.js
 */

const http = require('http');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const TEST_USER = {
  usernameOrEmail: process.env.TEST_USERNAME || 'admin',
  password: process.env.TEST_PASSWORD || 'admin123'
};

let authToken = null;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            rawBody: body
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
            rawBody: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function login() {
  log('\n🔐 Iniciando sesión...', 'cyan');
  const url = new URL(`${API_BASE_URL}/api/auth/login`);
  
  const options = {
    hostname: url.hostname,
    port: url.port || 3000,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    }
  };

  try {
    const response = await makeRequest(options, TEST_USER);
    if (response.status === 200 && response.body.token) {
      authToken = response.body.token;
      log('✅ Login exitoso', 'green');
      return true;
    } else {
      log(`❌ Error en login: ${response.status} - ${JSON.stringify(response.body)}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Error de conexión en login: ${error.message}`, 'red');
    return false;
  }
}

async function testEndpoint(name, method, path, expectedStatus = 200, body = null) {
  const url = new URL(`${API_BASE_URL}${path}`);
  
  const options = {
    hostname: url.hostname,
    port: url.port || 3000,
    path: url.pathname + (url.search || ''),
    method: method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (authToken) {
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const startTime = Date.now();
    const response = await makeRequest(options, body);
    const duration = Date.now() - startTime;

    const success = response.status === expectedStatus;
    const icon = success ? '✅' : '❌';
    const color = success ? 'green' : 'red';
    
    log(`${icon} ${name}`, color);
    log(`   Status: ${response.status} (esperado: ${expectedStatus})`, response.status === expectedStatus ? 'green' : 'red');
    log(`   Tiempo: ${duration}ms`, 'blue');
    
    if (response.body && typeof response.body === 'object') {
      if (Array.isArray(response.body)) {
        log(`   Items: ${response.body.length}`, 'blue');
      } else if (response.body.items) {
        log(`   Items: ${response.body.items.length}`, 'blue');
        log(`   Total: ${response.body.total || 'N/A'}`, 'blue');
      } else if (response.body.data) {
        log(`   Items: ${Array.isArray(response.body.data) ? response.body.data.length : 'N/A'}`, 'blue');
      }
    }

    if (!success) {
      log(`   Error: ${JSON.stringify(response.body).substring(0, 200)}`, 'red');
    }

    return { success, response };
  } catch (error) {
    log(`❌ ${name} - Error de conexión: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function runTests() {
  log('\n🧪 Iniciando pruebas de endpoints del panel admin\n', 'cyan');
  log('='.repeat(60), 'cyan');

  // Login primero
  const loginSuccess = await login();
  if (!loginSuccess) {
    log('\n❌ No se pudo autenticar. Abortando pruebas.', 'red');
    process.exit(1);
  }

  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };

  // Tests de endpoints
  const tests = [
    // Endpoints básicos del admin
    { name: 'GET /api/users', method: 'GET', path: '/api/users?limit=100', expectedStatus: 200 },
    { name: 'GET /api/areas', method: 'GET', path: '/api/areas', expectedStatus: 200 },
    { name: 'GET /api/beds', method: 'GET', path: '/api/beds', expectedStatus: 200 },
    { name: 'GET /api/patients', method: 'GET', path: '/api/patients?limit=1000', expectedStatus: 200 },
    
    // Endpoints específicos
    { name: 'GET /api/users (paginated)', method: 'GET', path: '/api/users?page=1&limit=200', expectedStatus: 200 },
    { name: 'GET /api/areas/:id', method: 'GET', path: '/api/areas/1', expectedStatus: 200 },
    { name: 'GET /api/beds/area/:id', method: 'GET', path: '/api/beds/area/1', expectedStatus: 200 },
    
    // Health check
    { name: 'GET /health', method: 'GET', path: '/health', expectedStatus: 200, needsAuth: false },
  ];

  log('\n📋 Ejecutando pruebas...\n', 'cyan');

  for (const test of tests) {
    results.total++;
    const result = await testEndpoint(test.name, test.method, test.path, test.expectedStatus, test.body);
    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }
    // Pequeña pausa entre requests
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Resumen
  log('\n' + '='.repeat(60), 'cyan');
  log('\n📊 Resumen de pruebas:', 'cyan');
  log(`   Total: ${results.total}`, 'blue');
  log(`   ✅ Pasadas: ${results.passed}`, 'green');
  log(`   ❌ Fallidas: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log(`   Porcentaje: ${((results.passed / results.total) * 100).toFixed(1)}%`, 
      results.failed === 0 ? 'green' : 'yellow');
  
  if (results.failed === 0) {
    log('\n🎉 ¡Todas las pruebas pasaron!', 'green');
  } else {
    log('\n⚠️  Algunas pruebas fallaron. Revisa los errores arriba.', 'yellow');
  }

  process.exit(results.failed > 0 ? 1 : 0);
}

// Ejecutar pruebas
runTests().catch(error => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  process.exit(1);
});
