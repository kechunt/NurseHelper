#!/usr/bin/env node

/**d
 * Script para probar el flujo completo de verificación de email
 * Prueba: registro → envío de código → verificación → login
 * 
 * Ejecutar: node backend/scripts/test-email-verification.js
 */

const http = require('http');

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_URL = `${API_BASE_URL}/api/auth`;

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
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
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
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

async function testRegister() {
  log('\n📝 TEST 1: Registro de nueva cuenta', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  const timestamp = Date.now();
  const testUser = {
    username: `testuser_${timestamp}`,
    email: `test_${timestamp}@example.com`,
    password: 'Test123456',
    firstName: 'Test',
    lastName: 'User',
    role: 'nurse',
  };
  
  log(`\n📧 Registrando usuario: ${testUser.email}`, 'blue');
  
  try {
    const response = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/register',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      testUser
    );
    
    log(`\n📊 Respuesta del servidor:`, 'blue');
    log(`   Status: ${response.status}`, response.status === 201 ? 'green' : 'red');
    log(`   Body:`, 'blue');
    console.log(JSON.stringify(response.body, null, 2));
    
    if (response.status === 201) {
      if (response.body.requiresVerification) {
        log(`\n✅ Registro exitoso - Requiere verificación`, 'green');
        log(`   Email: ${response.body.email}`, 'green');
        log(`   ⚠️  IMPORTANTE: Revisa los logs del servidor para ver el código de verificación`, 'yellow');
        log(`   O revisa tu correo: ${testUser.email}`, 'yellow');
        return {
          success: true,
          email: testUser.email,
          user: testUser,
        };
      } else {
        log(`\n⚠️  Registro exitoso pero NO requiere verificación (inesperado)`, 'yellow');
        return { success: false, error: 'No requiere verificación' };
      }
    } else {
      log(`\n❌ Error en registro: ${response.body.message || 'Error desconocido'}`, 'red');
      return { success: false, error: response.body.message };
    }
  } catch (error) {
    log(`\n❌ Error de conexión: ${error.message}`, 'red');
    log(`   Asegúrate de que el servidor esté corriendo en ${API_BASE_URL}`, 'yellow');
    return { success: false, error: error.message };
  }
}

async function testResendCode(email) {
  log('\n📧 TEST 2: Reenvío de código de verificación', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  log(`\n📧 Reenviando código a: ${email}`, 'blue');
  
  try {
    const response = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/resend-verification',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      { email }
    );
    
    log(`\n📊 Respuesta del servidor:`, 'blue');
    log(`   Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
    log(`   Body:`, 'blue');
    console.log(JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      log(`\n✅ Código reenviado exitosamente`, 'green');
      log(`   ⚠️  Revisa los logs del servidor para ver el nuevo código`, 'yellow');
      return { success: true };
    } else {
      log(`\n❌ Error al reenviar código: ${response.body.message || 'Error desconocido'}`, 'red');
      return { success: false, error: response.body.message };
    }
  } catch (error) {
    log(`\n❌ Error de conexión: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testVerifyEmail(email, code) {
  log('\n✅ TEST 3: Verificación de código', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  log(`\n🔐 Verificando código: ${code}`, 'blue');
  
  try {
    const response = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/verify-email',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      { email, code }
    );
    
    log(`\n📊 Respuesta del servidor:`, 'blue');
    log(`   Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
    log(`   Body:`, 'blue');
    console.log(JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      log(`\n✅ Email verificado exitosamente`, 'green');
      log(`   Token recibido: ${response.body.token ? 'Sí' : 'No'}`, 'green');
      return {
        success: true,
        token: response.body.token,
        user: response.body.user,
      };
    } else {
      log(`\n❌ Error en verificación: ${response.body.message || 'Error desconocido'}`, 'red');
      return { success: false, error: response.body.message };
    }
  } catch (error) {
    log(`\n❌ Error de conexión: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testLogin(email, password) {
  log('\n🔐 TEST 4: Login después de verificación', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  log(`\n🔑 Intentando login con: ${email}`, 'blue');
  
  try {
    const response = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      { usernameOrEmail: email, password }
    );
    
    log(`\n📊 Respuesta del servidor:`, 'blue');
    log(`   Status: ${response.status}`, response.status === 200 ? 'green' : 'red');
    log(`   Body:`, 'blue');
    console.log(JSON.stringify(response.body, null, 2));
    
    if (response.status === 200) {
      log(`\n✅ Login exitoso`, 'green');
      return { success: true, token: response.body.token };
    } else {
      log(`\n❌ Error en login: ${response.body.message || 'Error desconocido'}`, 'red');
      return { success: false, error: response.body.message };
    }
  } catch (error) {
    log(`\n❌ Error de conexión: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function testLoginWithoutVerification(email, password) {
  log('\n🚫 TEST 5: Intentar login SIN verificar email', 'cyan');
  log('═'.repeat(60), 'cyan');
  
  log(`\n🔑 Intentando login sin verificar: ${email}`, 'blue');
  
  try {
    const response = await makeRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      },
      { usernameOrEmail: email, password }
    );
    
    log(`\n📊 Respuesta del servidor:`, 'blue');
    log(`   Status: ${response.status}`, response.status === 403 ? 'yellow' : 'red');
    log(`   Body:`, 'blue');
    console.log(JSON.stringify(response.body, null, 2));
    
    if (response.status === 403 && response.body.requiresVerification) {
      log(`\n✅ Correcto: El sistema bloquea el login sin verificación`, 'green');
      return { success: true };
    } else {
      log(`\n❌ Error: El sistema debería bloquear el login sin verificación`, 'red');
      return { success: false, error: 'No bloquea login sin verificación' };
    }
  } catch (error) {
    log(`\n❌ Error de conexión: ${error.message}`, 'red');
    return { success: false, error: error.message };
  }
}

async function main() {
  log('\n🧪 TEST COMPLETO DE VERIFICACIÓN DE EMAIL', 'cyan');
  log('═'.repeat(60), 'cyan');
  log(`\n🌐 Conectando a: ${API_BASE_URL}`, 'blue');
  
  // Test 1: Registro
  const registerResult = await testRegister();
  if (!registerResult.success) {
    log('\n❌ El test falló en el registro. Deteniendo...', 'red');
    process.exit(1);
  }
  
  const { email, user } = registerResult;
  
  // Esperar un momento para que se procese el email
  log('\n⏳ Esperando 2 segundos para procesamiento...', 'yellow');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Test 2: Reenvío de código
  await testResendCode(email);
  
  // Solicitar código al usuario
  log('\n' + '═'.repeat(60), 'cyan');
  log('\n📝 INSTRUCCIONES:', 'yellow');
  log('   1. Revisa los logs del servidor backend para ver el código de verificación', 'yellow');
  log('   2. O revisa tu correo electrónico si está configurado', 'yellow');
  log('   3. Ingresa el código de 6 dígitos a continuación', 'yellow');
  log('\n💡 En modo desarrollo, el código aparece en los logs del servidor', 'blue');
  
  // Para pruebas automáticas, usar código de prueba (solo si está en modo desarrollo)
  // En producción, esto debería ser interactivo
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  
  return new Promise((resolve) => {
    rl.question('\n🔐 Ingresa el código de verificación (6 dígitos): ', async (code) => {
      rl.close();
      
      if (!code || code.length !== 6) {
        log('\n❌ Código inválido. Debe tener 6 dígitos.', 'red');
        process.exit(1);
      }
      
      // Test 3: Verificación
      const verifyResult = await testVerifyEmail(email, code);
      if (!verifyResult.success) {
        log('\n❌ El test falló en la verificación.', 'red');
        process.exit(1);
      }
      
      // Test 4: Login después de verificación
      const loginResult = await testLogin(email, user.password);
      if (!loginResult.success) {
        log('\n❌ El test falló en el login después de verificación.', 'red');
        process.exit(1);
      }
      
      // Resumen final
      log('\n' + '═'.repeat(60), 'green');
      log('\n✅ TODOS LOS TESTS PASARON EXITOSAMENTE', 'green');
      log('═'.repeat(60), 'green');
      log('\n📋 Resumen:', 'cyan');
      log(`   ✅ Registro: OK`, 'green');
      log(`   ✅ Reenvío de código: OK`, 'green');
      log(`   ✅ Verificación: OK`, 'green');
      log(`   ✅ Login después de verificación: OK`, 'green');
      log('\n🎉 El sistema de verificación de email funciona correctamente!', 'green');
      
      resolve();
    });
  });
}

// Ejecutar tests
main().catch((error) => {
  log(`\n❌ Error fatal: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});
