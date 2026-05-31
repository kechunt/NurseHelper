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

const { freePorts, freePort, killProcessTree, isWindows, nukeDevEnvironment, killStaleNgrok, readNgrokApiKey, stopRemoteNgrokSessions } = require('./port-utils');

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
function attachQuietDevLogs(proc, onFatalError) {
  const handleChunk = (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (isDevErrorLine(line)) {
        log(`  ${line.trim()}`, 'red');
        if (/port \d+ is already|EADDRINUSE|fallaron las migraciones|migration failed/i.test(line)) {
          onFatalError?.(line.trim());
        }
      } else if (isDevWarnLine(line)) {
        log(`  ${line.trim()}`, 'yellow');
      }
    }
  };
  proc.stdout?.on('data', handleChunk);
  proc.stderr?.on('data', handleChunk);
}

async function ensurePortsNotServing(ports, logFn) {
  for (const port of ports) {
    if (await isHttpUp(port)) {
      logFn(`⚠️  :${port} responde HTTP — forzando liberación...`, 'yellow');
      freePort(port, logFn);
      await sleep(2500);
    }
  }
}

function printServicesReady() {
  log('');
  log(`${colors.bold}  ✓ Backend y frontend listos — abriendo túnel...${colors.reset}`, 'green');
  log('');
}

const READY_STREAK_REQUIRED = 2;
const PROGRESS_INTERVAL_MS = 15_000;

function formatElapsed(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return min > 0 ? `${min}m ${sec}s` : `${sec}s`;
}

async function waitForServices(timeoutMs, devStartedAt = Date.now(), getFatalError = () => null) {
  const checks = [
    { label: 'Backend', port: BACKEND_PORT, ready: isBackendReady, streak: 0 },
    { label: 'Frontend', port: FRONTEND_PORT, ready: isFrontendReady, streak: 0 },
  ];
  const pending = new Set(checks.map((c) => c.label));
  const started = Date.now();
  let lastProgressAt = started;

  log('');
  log('  ⏳  Esperando servicios (primera vez: ~1–2 min)...', 'yellow');
  for (const c of checks) {
    printRow(c.label, `puerto ${c.port}`, 'dim', 'dim');
  }
  log('');
  log('  💡  Compilando Angular + backend — no cierres esta ventana', 'dim');
  log('');

  while (Date.now() - started < timeoutMs && pending.size > 0) {
    const fatal = getFatalError();
    if (fatal) {
      log(`  ❌  ${fatal}`, 'red');
      return false;
    }

    for (const check of checks) {
      if (!pending.has(check.label)) continue;
      if (await check.ready()) {
        check.streak += 1;
        if (check.streak >= READY_STREAK_REQUIRED) {
          pending.delete(check.label);
          printRow(check.label, `listo · :${check.port}`, 'green', 'green');
        }
      } else {
        check.streak = 0;
      }
    }

    const elapsed = Date.now() - started;
    if (pending.size > 0 && Date.now() - lastProgressAt >= PROGRESS_INTERVAL_MS) {
      lastProgressAt = Date.now();
      const waiting = [...pending].join(', ');
      printRow('Esperando', `${formatElapsed(elapsed)} · ${waiting}`, 'yellow', 'dim');
    }

    if (pending.size > 0) {
      await sleep(2000);
    }
  }

  if (pending.size > 0) {
    return false;
  }

  await sleep(1500);
  const backendOk = await isBackendReady();
  const frontendOk = await isFrontendReady();
  if (!backendOk || !frontendOk) {
    log('  ⚠️  Un servicio dejó de responder tras el arranque', 'red');
    return false;
  }

  if (Date.now() - devStartedAt < 8000) {
    log('  ⚠️  Respuesta demasiado rápida — puede ser un proceso anterior en el puerto', 'yellow');
    await sleep(4000);
    if (!(await isBackendReady()) || !(await isFrontendReady())) {
      return false;
    }
  }

  printServicesReady();
  return true;
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

function ngrokApiRequest(method, urlPath) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { hostname: '127.0.0.1', port: 4040, path: urlPath, method, timeout: 3000 },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.end();
  });
}

async function stopLocalNgrokApiTunnels(logFn) {
  try {
    const data = await fetchNgrokTunnels();
    for (const tunnel of data.tunnels || []) {
      if (!tunnel.name) continue;
      await ngrokApiRequest('DELETE', `/api/tunnels/${encodeURIComponent(tunnel.name)}`);
      logFn(`  Túnel local cerrado (${tunnel.name})`, 'dim');
    }
  } catch {
    /* sin agente local en :4040 */
  }
}

function forwardsToPort(endpoints, port) {
  const addr = String(endpoints?.forwardsTo || '');
  return addr.includes(`:${port}`) || addr === String(port) || addr.endsWith(`localhost:${port}`);
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

async function waitForNgrokOrConflict(proc, timeoutMs = 25_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    if (proc.sawEndpointConflict?.()) {
      return { conflict: true, endpoints: null };
    }
    if (proc.exitCode !== null && proc.exitCode !== 0) {
      return { conflict: proc.sawEndpointConflict?.() ?? true, endpoints: null };
    }

    try {
      const data = await fetchNgrokTunnels();
      const endpoints = parseNgrokEndpoints(data);
      if (endpoints.primaryUrl) {
        return { conflict: false, endpoints };
      }
    } catch {
      /* API aún no disponible */
    }

    await sleep(600);
  }

  if (proc.sawEndpointConflict?.()) {
    return { conflict: true, endpoints: null };
  }

  return { conflict: false, endpoints: null };
}

async function releaseNgrokEndpoint(logFn) {
  killStaleNgrok(logFn);
  await stopLocalNgrokApiTunnels(logFn);
  const stoppedRemote = await stopRemoteNgrokSessions(logFn);
  if (stoppedRemote > 0) {
    logFn('  Esperando liberación del dominio en ngrok...', 'dim');
    await sleep(5000);
  } else {
    await sleep(2500);
  }
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

function startDev(onFatalError) {
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

  attachQuietDevLogs(devProcess, onFatalError);

  devProcess.on('error', (err) => {
    log(`❌ No se pudo iniciar start-dev.js: ${err.message}`, 'red');
    process.exit(1);
  });

  return devProcess;
}

function resolveNgrokBin() {
  try {
    if (isWindows) {
      const out = execSync('where ngrok', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      return out.split(/\r?\n/)[0].trim();
    }
    return execSync('command -v ngrok', { encoding: 'utf8', shell: true }).trim();
  } catch {
    return 'ngrok';
  }
}

function startNgrok(port, { poolingEnabled = false } = {}) {
  const args = ['http', String(port), '--log=stdout'];
  if (poolingEnabled) {
    args.push('--pooling-enabled');
  }

  const ngrokBin = resolveNgrokBin();
  const ngrokProcess = spawn(ngrokBin, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: false,
  });

  let sawEndpointConflict = false;

  ngrokProcess.stdout?.on('data', () => {});
  ngrokProcess.stderr?.on('data', (chunk) => {
    const text = chunk.toString();
    if (/ERR_NGROK_334|already online/i.test(text)) {
      sawEndpointConflict = true;
    }
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('{') && !trimmed.includes('msg=')) {
        log(`  [ngrok] ${trimmed}`, sawEndpointConflict ? 'red' : 'yellow');
      }
    }
  });

  ngrokProcess.on('error', (err) => {
    log(`❌ No se pudo ejecutar ngrok: ${err.message}`, 'red');
    process.exit(1);
  });

  ngrokProcess.sawEndpointConflict = () => sawEndpointConflict;
  return ngrokProcess;
}

async function openNgrokTunnel(port) {
  const logFn = (msg, color) => log(`  ${msg}`, color);
  await releaseNgrokEndpoint(logFn);

  let existing = await waitForNgrokEndpoints(3000);
  if (existing?.primaryUrl && forwardsToPort(existing, port)) {
    log('  ♻️  Reutilizando túnel ngrok ya activo', 'green');
    return { process: null, endpoints: existing, reused: true, conflict: false };
  }

  const strategies = [
    { poolingEnabled: true, label: 'con --pooling-enabled' },
    { poolingEnabled: false, label: 'estándar' },
  ];

  let sawConflict = false;

  for (let i = 0; i < strategies.length; i += 1) {
    const { poolingEnabled, label } = strategies[i];
    if (i > 0) {
      await releaseNgrokEndpoint(logFn);
      log(`  🔁  Reintentando ngrok (${label})...`, 'yellow');
    }

    const proc = startNgrok(port, { poolingEnabled });
    const result = await waitForNgrokOrConflict(proc, 25_000);

    if (result.endpoints?.primaryUrl) {
      return { process: proc, endpoints: result.endpoints, reused: false, conflict: false };
    }

    if (result.conflict) sawConflict = true;
    killProcessTree(proc);
    await sleep(1200);
  }

  if (sawConflict) {
    await releaseNgrokEndpoint(logFn);
    const proc = startNgrok(port, { poolingEnabled: true });
    const result = await waitForNgrokOrConflict(proc, 20_000);
    if (result.endpoints?.primaryUrl) {
      return { process: proc, endpoints: result.endpoints, reused: false, conflict: false };
    }
    killProcessTree(proc);
  }

  existing = await waitForNgrokEndpoints(3000);
  if (existing?.primaryUrl) {
    return { process: null, endpoints: existing, reused: true, conflict: false };
  }

  return { process: null, endpoints: null, reused: false, conflict: sawConflict };
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
  killStaleNgrok((msg, color) => log(`  ${msg}`, color));
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

  await ensurePortsNotServing([BACKEND_PORT, FRONTEND_PORT], (msg, color) => log(`  ${msg}`, color));
  log('');

  let devStartedAt = Date.now();
  let devFatalError = null;

  if (!onlyTunnel) {
    devProcess = startDev((msg) => {
      devFatalError = msg;
    });
    devStartedAt = Date.now();
    devProcess.on('exit', (code) => {
      if (shuttingDown) return;
      if (ngrokProcess && !ngrokProcess.killed) {
        ngrokProcess.kill('SIGTERM');
      }
      if (code && code !== 0) {
        log('');
        printBox('La aplicación se detuvo antes de abrir el túnel', [
          { text: 'Revisa MySQL activo, migraciones y puertos 3000/4200', color: 'red' },
          { text: 'Prueba: npm run dev (sin túnel) para ver el error completo', color: 'yellow' },
        ], 'red');
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

  const ready = await waitForServices(WAIT_TIMEOUT_MS, devStartedAt, () => devFatalError);
  if (!ready) {
    printBox('Tiempo de espera agotado', [
      { text: 'Backend o frontend no arrancaron a tiempo (~3 min)', color: 'red' },
      { text: `Revisa MySQL activo y puertos ${BACKEND_PORT} / ${FRONTEND_PORT}`, color: 'yellow' },
      { text: 'Diagnóstico: npm run dev  (sin túnel, muestra todos los logs)', color: 'dim' },
    ], 'red');
    shutdown();
    process.exit(1);
  }

  printTunnelStarting();

  let summaryPrinted = false;

  const tunnelResult = await openNgrokTunnel(FRONTEND_PORT);
  ngrokProcess = tunnelResult.process;

  if (tunnelResult.endpoints?.primaryUrl) {
    summaryPrinted = true;
    printConnectionSummary(tunnelResult.endpoints);
  } else {
    const hasApiKey = Boolean(readNgrokApiKey());
    printBox('No se pudo abrir ngrok', [
      { text: 'ERR_NGROK_334: tu dominio dev ya está en uso en la nube', color: 'red' },
      { text: 'Panel: https://dashboard.ngrok.com/tunnels/agents', color: 'cyan' },
      { text: 'Cierra la sesión activa y vuelve a ejecutar npm run tunnel', color: 'yellow' },
      ...(hasApiKey
        ? [{ text: 'Con api_key configurada el script cierra sesiones remotas solo', color: 'dim' }]
        : [
            { text: 'Opcional: añade api_key en ngrok.yml (https://dashboard.ngrok.com/api)', color: 'dim' },
            { text: '  o exporta NGROK_API_KEY para cierre automático', color: 'dim' },
          ]),
      { text: 'Windows local: taskkill /IM ngrok.exe /F', color: 'dim' },
      { text: 'La app local sigue en http://localhost:4200', color: 'green' },
      { text: 'Reintenta solo túnel: npm run tunnel -- --only', color: 'dim' },
    ], 'red');
  }

  if (ngrokProcess) {
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
      if (shuttingDown || summaryPrinted) return;

      waitForNgrokEndpoints(3000).then((endpoints) => {
        if (endpoints?.primaryUrl) {
          summaryPrinted = true;
          printConnectionSummary(endpoints);
          return;
        }
        log('');
        log('  ⚠️  ngrok se cerró; la app local sigue en http://localhost:4200', 'yellow');
        log('  💡  Reintenta: npm run tunnel -- --only', 'dim');
        log('');
      });
    });
  }
}

main().catch((err) => {
  log(`❌ Error: ${err.message}`, 'red');
  process.exit(1);
});
