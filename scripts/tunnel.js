#!/usr/bin/env node

/**
 * Inicia la app (start-dev.js) y luego abre ngrok hacia el frontend (:4200).
 * Un solo comando, una sola terminal.
 *
 * Uso:
 *   npm run tunnel
 *   node scripts/tunnel.js
 *   node scripts/tunnel.js --only     # solo ngrok (la app ya debe estar en :4200)
 */

const { execSync, spawn } = require('child_process');
const http = require('http');
const os = require('os');
const path = require('path');

const colors = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

const { freePorts, killProcessTree, isWindows, nukeDevEnvironment } = require('./port-utils');

const REPO_ROOT = path.join(__dirname, '..');
const START_DEV = path.join(__dirname, 'start-dev.js');
const FRONTEND_PORT = 4200;
const BACKEND_PORT = 3000;
const WAIT_TIMEOUT_MS = 180_000;
const NGROK_API = 'http://127.0.0.1:4040/api/tunnels';
const BOX_INNER = 60;
const BOX_WIDTH = BOX_INNER + 4;

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function visibleLength(str) {
  return String(str).replace(/\x1b\[[0-9;]*m/g, '').length;
}

function padVisible(str, width) {
  const s = String(str);
  const pad = Math.max(0, width - visibleLength(s));
  return s + ' '.repeat(pad);
}

function hr(char = '─') {
  log(char.repeat(BOX_WIDTH), 'dim');
}

function printRow(label, value, labelColor = 'dim', valueColor = 'cyan') {
  const labelText = `${colors[labelColor]}${padVisible(label, 14)}${colors.reset}`;
  const valueText = `${colors[valueColor]}${value}${colors.reset}`;
  log(`  ${labelText} ${valueText}`);
}

function printBox(title, lines, accent = 'green') {
  const border = colors[accent] || colors.green;
  const top = `${border}╔${'═'.repeat(BOX_WIDTH - 2)}╗${colors.reset}`;
  const bottom = `${border}╚${'═'.repeat(BOX_WIDTH - 2)}╝${colors.reset}`;
  const side = `${border}║${colors.reset}`;
  const sideEnd = `${border}║${colors.reset}`;

  log('');
  log(top);
  if (title) {
    const t = padVisible(` ${title} `, BOX_INNER);
    log(`${side}${colors.bold}${t}${colors.reset}${sideEnd}`);
    log(`${border}╠${'═'.repeat(BOX_WIDTH - 2)}╣${colors.reset}`);
  }
  for (const line of lines) {
    const content =
      typeof line === 'string'
        ? line
        : `${colors[line.color || 'reset']}${line.text}${colors.reset}`;
    log(`${side}${padVisible(` ${content}`, BOX_INNER)}${sideEnd}`);
  }
  log(bottom);
  log('');
}

function printBanner() {
  const osLabel = isWindows ? 'Windows' : process.platform === 'darwin' ? 'macOS' : process.platform;
  printBox('NurseHelper · desarrollo + túnel ngrok', [
    { text: `Sistema: ${osLabel}`, color: 'dim' },
    { text: 'Un solo comando: app local + URL pública', color: 'dim' },
    { text: 'Detener todo: Ctrl+C', color: 'dim' },
  ], 'magenta');
}

function parseArgs(argv) {
  return { onlyTunnel: argv.includes('--only') || argv.includes('--tunnel-only') };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function isNgrokInstalled() {
  try {
    execSync('ngrok version', { stdio: 'pipe' });
    return true;
  } catch {
    if (!isWindows) return false;
    try {
      execSync('where ngrok', { stdio: 'pipe' });
      return true;
    } catch {
      return false;
    }
  }
}

function getLanIpv4Addresses() {
  const ips = [];
  const ifaces = os.networkInterfaces();
  for (const name of Object.keys(ifaces)) {
    if (/^(lo|lo0|utun|awdl|bridge)/i.test(name)) continue;
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal) {
        ips.push({ name, address: iface.address });
      }
    }
  }
  return ips;
}

function isHttpUp(port, path = '/') {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: 'localhost', port, path, timeout: 2500 },
      (res) => {
        res.resume();
        resolve(res.statusCode > 0);
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

function isHealthOk(port) {
  return new Promise((resolve) => {
    const req = http.get(
      { hostname: 'localhost', port, path: '/health', timeout: 2500 },
      (res) => {
        let body = '';
        res.on('data', (c) => {
          body += c;
        });
        res.on('end', () => {
          if (res.statusCode !== 200) {
            resolve(false);
            return;
          }
          try {
            const json = JSON.parse(body);
            const st = json.status;
            resolve(st === 'ok' || st === 'healthy' || json.ok === true);
          } catch {
            resolve(true);
          }
        });
      },
    );
    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });
  });
}

/** Solo HTTP válido: evita falsos positivos con procesos zombi en el puerto. */
async function isBackendReady() {
  return isHealthOk(BACKEND_PORT);
}

async function isFrontendReady() {
  return isHttpUp(FRONTEND_PORT, '/');
}

function isDevErrorLine(line) {
  const t = line.trim();
  if (!t) return false;
  return /(\[error\]|error:|❌|failed|exception|econnrefused|crashed|fatal|unhandled|proxy error|port \d+ is already|fallaron las migraciones|migration failed|ENOTFOUND|EADDRINUSE)/i.test(
    t,
  );
}

function isDevWarnLine(line) {
  const t = line.trim();
  return /(\[warn\]|warning:|⚠️)/i.test(t);
}

/** Muestra solo errores/advertencias del arranque (backend/frontend). */
function attachQuietDevLogs(proc) {
  const handleChunk = (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (isDevErrorLine(line)) {
        log(`  ${line.trim()}`, 'red');
      } else if (isDevWarnLine(line)) {
        log(`  ${line.trim()}`, 'yellow');
      }
    }
  };
  proc.stdout?.on('data', handleChunk);
  proc.stderr?.on('data', handleChunk);
}

function printServicesReady() {
  log('');
  log(`${colors.bold}  ✓ Backend y frontend listos — abriendo túnel...${colors.reset}`, 'green');
  log('');
}

async function waitForServices(timeoutMs) {
  const checks = [
    { label: 'Backend', port: BACKEND_PORT, ready: isBackendReady },
    { label: 'Frontend', port: FRONTEND_PORT, ready: isFrontendReady },
  ];
  const pending = new Set(checks.map((c) => c.label));
  const started = Date.now();

  log('');
  log('  ⏳  Esperando servicios...', 'yellow');
  for (const c of checks) {
    printRow(c.label, `puerto ${c.port}`, 'dim', 'dim');
  }
  log('');

  while (Date.now() - started < timeoutMs && pending.size > 0) {
    for (const check of checks) {
      if (!pending.has(check.label)) continue;
      if (await check.ready()) {
        pending.delete(check.label);
        printRow(check.label, `listo · :${check.port}`, 'green', 'green');
      }
    }
    if (pending.size > 0) {
      await sleep(2000);
    }
  }

  if (pending.size === 0) {
    printServicesReady();
    return true;
  }
  return false;
}

function fetchNgrokTunnels() {
  return new Promise((resolve, reject) => {
    const req = http.get(NGROK_API, { timeout: 3000 }, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

function parseNgrokEndpoints(data) {
  const tunnels = data?.tunnels || [];
  const https = tunnels.find((t) => t.public_url?.startsWith('https://'));
  const http = tunnels.find((t) => t.public_url?.startsWith('http://'));
  const primary = https || http || tunnels[0];
  return {
    httpsUrl: https?.public_url || null,
    httpUrl: http?.public_url || null,
    primaryUrl: primary?.public_url || null,
    forwardsTo: primary?.config?.addr || `http://localhost:${FRONTEND_PORT}`,
    tunnelName: primary?.name || '—',
    region: data?.region || null,
  };
}

async function waitForNgrokEndpoints(timeoutMs = 30_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const data = await fetchNgrokTunnels();
      const endpoints = parseNgrokEndpoints(data);
      if (endpoints.primaryUrl) return endpoints;
    } catch {
      /* API aún no disponible */
    }
    await sleep(1000);
  }
  return null;
}

function buildConnectionUrls(endpoints) {
  const tunnelBase = (endpoints.httpsUrl || endpoints.primaryUrl || '').replace(/\/$/, '');
  const localApp = `http://localhost:${FRONTEND_PORT}`;
  const localApi = `http://localhost:${BACKEND_PORT}/api`;
  const localSwagger = `http://localhost:${BACKEND_PORT}/api-docs`;
  const lan = getLanIpv4Addresses();

  return {
    tunnelBase,
    tunnelApp: tunnelBase || '—',
    tunnelApi: tunnelBase ? `${tunnelBase}/api` : '—',
    tunnelHttp: endpoints.httpUrl && endpoints.httpUrl !== tunnelBase ? endpoints.httpUrl : null,
    localApp,
    localApi,
    localSwagger,
    lanApps: lan.map(({ name, address }) => ({
      name,
      url: `http://${address}:${FRONTEND_PORT}`,
    })),
    inspector: 'http://127.0.0.1:4040',
    forwardsTo: endpoints.forwardsTo,
  };
}

/** Resumen final: todas las URLs/IPs para conectarse. */
function printConnectionSummary(endpoints) {
  const u = buildConnectionUrls(endpoints);

  log('\n'.repeat(2));
  log('▓'.repeat(BOX_WIDTH), 'green');
  printBox('CONECTAR · copia estas URLs', [{ text: u.tunnelApp, color: 'green' }], 'green');

  log(`${colors.bold}  🌍 Internet (ngrok) — usa esto desde otro celular/PC${colors.reset}`, 'green');
  hr();
  printRow('Principal', u.tunnelApp, 'dim', 'green');
  printRow('App', u.tunnelApp, 'dim', 'green');
  printRow('API', u.tunnelApi, 'dim', 'cyan');
  if (u.tunnelHttp) {
    printRow('HTTP', u.tunnelHttp, 'dim', 'cyan');
  }
  printRow('Nota', 'Primera visita: botón "Visit Site" en ngrok', 'dim', 'yellow');

  log('');
  log(`${colors.bold}  🏠 Solo en esta computadora (localhost)${colors.reset}`, 'cyan');
  hr();
  printRow('App', u.localApp, 'dim', 'cyan');
  printRow('API', u.localApi, 'dim', 'cyan');
  printRow('Swagger', u.localSwagger, 'dim', 'cyan');

  if (u.lanApps.length > 0) {
    log('');
    log(`${colors.bold}  📶 Misma red Wi‑Fi (sin ngrok)${colors.reset}`, 'yellow');
    hr();
    for (const { name, url } of u.lanApps.slice(0, 4)) {
      printRow(name, url, 'dim', 'yellow');
    }
  }

  log('');
  log(`${colors.bold}  🔧 Panel y depuración${colors.reset}`, 'blue');
  hr();
  printRow('Inspector', u.inspector, 'dim', 'blue');
  printRow('Túnel →', u.forwardsTo, 'dim', 'dim');

  log('');
  log(`${colors.bold}  📋 Copiar (una línea = una URL)${colors.reset}`, 'dim');
  hr();
  const copyLines = [
    `TUNEL_APP=${u.tunnelApp}`,
    `TUNEL_API=${u.tunnelApi}`,
    `LOCAL_APP=${u.localApp}`,
    `LOCAL_API=${u.localApi}`,
  ];
  for (const { name, url } of u.lanApps.slice(0, 2)) {
    copyLines.push(`LAN_${name.toUpperCase()}=${url}`);
  }
  for (const line of copyLines) {
    log(`  ${colors.dim}${line}${colors.reset}`);
  }
  log('');
  log(`${colors.dim}  Detener todo: Ctrl+C  ·  Solo se muestran errores del servidor abajo${colors.reset}`);
  log('▓'.repeat(BOX_WIDTH), 'green');
  log('\n');
}

function printTunnelStarting() {
  log('');
  log('  🚇  Conectando ngrok al frontend...', 'magenta');
  printRow('Destino', `http://localhost:${FRONTEND_PORT}`, 'dim', 'magenta');
  log('');
}

function startDev() {
  log('  🚀  Iniciando backend + frontend...', 'cyan');
  log('');

  const devProcess = spawn(process.execPath, [START_DEV], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
    env: {
      ...process.env,
      NURSEHELPER_TUNNEL: '1',
      LOG_LEVEL: 'error',
    },
  });

  attachQuietDevLogs(devProcess);

  devProcess.on('error', (err) => {
    log(`❌ No se pudo iniciar start-dev.js: ${err.message}`, 'red');
    process.exit(1);
  });

  return devProcess;
}

function startNgrok(port) {
  const ngrokProcess = spawn('ngrok', ['http', String(port), '--log=stdout'], {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
  });

  ngrokProcess.stdout?.on('data', () => {});
  ngrokProcess.stderr?.on('data', (chunk) => {
    const line = chunk.toString().trim();
    if (line && !line.startsWith('{') && !line.includes('msg=')) {
      log(`  [ngrok] ${line}`, 'yellow');
    }
  });

  ngrokProcess.on('error', (err) => {
    log(`❌ No se pudo ejecutar ngrok: ${err.message}`, 'red');
    process.exit(1);
  });

  return ngrokProcess;
}

async function main() {
  const { onlyTunnel } = parseArgs(process.argv.slice(2));

  printBanner();

  if (!isNgrokInstalled()) {
    const installHints = isWindows
      ? [
          { text: 'Windows: choco install ngrok  o  scoop install ngrok', color: 'yellow' },
          { text: 'O descarga: https://ngrok.com/download', color: 'dim' },
        ]
      : [
          { text: 'macOS: brew install ngrok/ngrok/ngrok', color: 'yellow' },
          { text: 'Docs:  https://ngrok.com/download', color: 'dim' },
        ];
    printBox('ngrok no encontrado', installHints, 'red');
    process.exit(1);
  }

  let devProcess = null;
  let ngrokProcess = null;
  let urlPollTimer = null;
  let shuttingDown = false;

  const shutdown = () => {
    if (shuttingDown) return;
    shuttingDown = true;
    if (urlPollTimer) clearInterval(urlPollTimer);
    log('');
    log('  🛑  Deteniendo túnel y aplicación...', 'yellow');
    log('');

    killProcessTree(ngrokProcess);
    killProcessTree(devProcess);

    try {
      nukeDevEnvironment([BACKEND_PORT, FRONTEND_PORT], REPO_ROOT);
    } catch {
      /* ignorar */
    }

    setTimeout(() => process.exit(0), 1500);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  log('  🔍  Cerrando sesiones dev previas y liberando puertos...', 'blue');
  const portsOk = nukeDevEnvironment(
    [BACKEND_PORT, FRONTEND_PORT],
    REPO_ROOT,
    (msg, color) => log(`  ${msg}`, color),
  );
  if (!portsOk) {
    printBox('Puertos ocupados', [
      { text: 'Cierra otras ventanas de npm run dev / ng serve', color: 'yellow' },
      { text: 'Windows: netstat -ano | findstr :4200', color: 'dim' },
      { text: 'macOS:   lsof -ti:4200 | xargs kill -9', color: 'dim' },
    ], 'red');
    process.exit(1);
  }
  log('');

  if (!onlyTunnel) {
    devProcess = startDev();
    devProcess.on('exit', (code) => {
      if (shuttingDown) return;
      if (ngrokProcess && !ngrokProcess.killed) {
        ngrokProcess.kill('SIGTERM');
      }
      process.exit(code ?? 0);
    });
  } else if (!(await isFrontendReady())) {
    printBox('Frontend no disponible', [
      { text: `Nada responde en el puerto ${FRONTEND_PORT}`, color: 'red' },
      { text: 'Ejecuta sin --only: npm run tunnel', color: 'yellow' },
    ], 'red');
    process.exit(1);
  }

  const ready = await waitForServices(WAIT_TIMEOUT_MS);
  if (!ready) {
    printBox('Tiempo de espera agotado', [
      { text: 'Backend o frontend no arrancaron a tiempo', color: 'red' },
      { text: `Revisa MySQL y los puertos ${BACKEND_PORT} / ${FRONTEND_PORT}`, color: 'yellow' },
    ], 'red');
    shutdown();
    process.exit(1);
  }

  printTunnelStarting();
  ngrokProcess = startNgrok(FRONTEND_PORT);

  let summaryPrinted = false;
  urlPollTimer = setInterval(async () => {
    if (summaryPrinted || shuttingDown) return;
    const endpoints = await waitForNgrokEndpoints(2500);
    if (endpoints?.primaryUrl) {
      summaryPrinted = true;
      clearInterval(urlPollTimer);
      printConnectionSummary(endpoints);
    }
  }, 1500);

  setTimeout(() => {
    if (!summaryPrinted && !shuttingDown) {
      printBox('No se leyó la URL del túnel', [
        { text: 'Abre el inspector: http://127.0.0.1:4040', color: 'yellow' },
        { text: 'Ahí verás la URL pública (Forwarding)', color: 'dim' },
      ], 'yellow');
    }
  }, 35_000);

  ngrokProcess.on('exit', (code) => {
    if (urlPollTimer) clearInterval(urlPollTimer);
    if (!shuttingDown) {
      log('');
      log('  🛑  Túnel ngrok cerrado.', 'yellow');
      shutdown();
    }
    setTimeout(() => process.exit(code ?? 0), 500);
  });
}

main().catch((err) => {
  log(`❌ Error: ${err.message}`, 'red');
  process.exit(1);
});
