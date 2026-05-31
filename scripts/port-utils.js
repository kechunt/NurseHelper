/**
 * Utilidades de puertos (macOS, Linux, Windows).
 * Usado por start-dev.js y tunnel.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const https = require('https');
const os = require('os');
const path = require('path');

const isWindows = process.platform === 'win32';

function sleepMs(ms) {
  if (isWindows) {
    const seconds = Math.max(1, Math.ceil(ms / 1000));
    execSync(`ping -n ${seconds + 1} 127.0.0.1 >nul`, { stdio: 'pipe' });
  } else {
    execSync(`sleep ${Math.max(1, Math.ceil(ms / 1000))}`, { stdio: 'pipe' });
  }
}

function getListeningPids(port) {
  const pids = new Set();

  if (isWindows) {
    try {
      const out = execSync('netstat -ano -p tcp', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const portSuffix = `:${port}`;
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const localAddress = parts[1] || '';
        const localPort = localAddress.includes(':')
          ? localAddress.slice(localAddress.lastIndexOf(':') + 1)
          : '';
        if (localPort !== String(port)) continue;
        const pid = parts[parts.length - 1];
        if (/^\d+$/.test(pid) && pid !== '0') {
          pids.add(Number(pid));
        }
      }
    } catch {
      /* puerto libre */
    }
    return [...pids];
  }

  try {
    const out = execSync(`lsof -ti:${port} -sTCP:LISTEN`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    if (!out) return [];
    return out
      .split(/\s+/)
      .map((p) => Number(p))
      .filter((p) => Number.isFinite(p) && p > 0);
  } catch {
    try {
      const out = execSync(`lsof -ti:${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      if (!out) return [];
      return out
        .split(/\s+/)
        .map((p) => Number(p))
        .filter((p) => Number.isFinite(p) && p > 0);
    } catch {
      return [];
    }
  }
}

function killPid(pid) {
  if (!pid || pid === process.pid) return;
  try {
    if (isWindows) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'pipe' });
    } else {
      execSync(`kill -9 ${pid}`, { stdio: 'pipe' });
    }
  } catch {
    /* proceso ya terminado */
  }
}

function killProcessTree(child) {
  if (!child?.pid) return;
  try {
    if (isWindows) {
      execSync(`taskkill /PID ${child.pid} /T /F`, { stdio: 'pipe' });
    } else {
      child.kill('SIGTERM');
    }
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      /* ignorar */
    }
  }
}

function freePort(port, logFn = () => {}) {
  const pids = getListeningPids(port);
  if (pids.length === 0) {
    logFn(`✅ Puerto ${port} está libre`, 'green');
    return true;
  }

  logFn(`⚠️  Puerto ${port} en uso (PID: ${pids.join(', ')}). Liberando...`, 'yellow');
  for (const pid of pids) {
    killPid(pid);
  }

  sleepMs(1200);

  const remaining = getListeningPids(port);
  if (remaining.length > 0) {
    logFn(`❌ No se pudo liberar el puerto ${port} (aún: ${remaining.join(', ')})`, 'red');
    return false;
  }

  logFn(`✅ Puerto ${port} liberado`, 'green');
  return true;
}

function freePorts(ports, logFn) {
  let ok = true;
  for (const port of ports) {
    if (!freePort(port, logFn)) ok = false;
  }
  return ok;
}

/** Mata procesos dev huérfanos (concurrently, ng serve, nodemon) del repo. */
function killStaleDevRunners(repoRoot, logFn = () => {}) {
  const repoName = path.basename(repoRoot);
  const markers = ['concurrently.js', 'start:backend', 'start:frontend', 'ng serve', 'nodemon'];

  if (isWindows) {
    try {
      const ps = [
        `Get-CimInstance Win32_Process -Filter "Name = 'node.exe'"`,
        `| Where-Object { $_.CommandLine -like '*${repoName}*'`,
        `-and ($_.CommandLine -like '*concurrently*' -or $_.CommandLine -like '*ng serve*' -or $_.CommandLine -like '*nodemon*' -or $_.CommandLine -like '*start-dev*') }`,
        `| ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`,
      ].join(' ');
      execSync(`powershell -NoProfile -Command "${ps}"`, { stdio: 'pipe' });
      logFn('  Procesos dev previos de Node cerrados (Windows)', 'dim');
    } catch {
      /* sin procesos */
    }
    return;
  }

  try {
    const out = execSync('ps -ax -o pid=,command=', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 16 * 1024 * 1024,
    });
    for (const line of out.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const match = trimmed.match(/^(\d+)\s+(.*)$/);
      if (!match) continue;
      const pid = Number(match[1]);
      const cmd = match[2];
      if (!Number.isFinite(pid) || pid === process.pid) continue;
      if (!cmd.includes(repoName) && !cmd.includes(repoRoot)) continue;
      if (!markers.some((m) => cmd.includes(m))) continue;
      logFn(`  Cerrando proceso previo (PID ${pid})`, 'yellow');
      killPid(pid);
    }
  } catch {
    /* ignorar */
  }
}

/** Limpieza fuerte antes de tunnel / reinicio. */
function nukeDevEnvironment(ports, repoRoot, logFn = () => {}) {
  killStaleDevRunners(repoRoot, logFn);
  sleepMs(500);

  for (let round = 0; round < 3; round += 1) {
    const quiet = round > 0;
    freePorts(ports, quiet ? () => {} : logFn);
    sleepMs(900);
  }

  const busy = ports.filter((p) => getListeningPids(p).length > 0);
  if (busy.length > 0) {
    logFn(`❌ Puertos aún ocupados: ${busy.join(', ')}`, 'red');
    return false;
  }
  return true;
}

function ngrokConfigPaths() {
  if (isWindows) {
    const base = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
    return [path.join(base, 'ngrok', 'ngrok.yml')];
  }
  if (process.platform === 'darwin') {
    return [path.join(os.homedir(), 'Library', 'Application Support', 'ngrok', 'ngrok.yml')];
  }
  return [path.join(os.homedir(), '.config', 'ngrok', 'ngrok.yml')];
}

/** API key de ngrok (env NGROK_API_KEY o api_key en ngrok.yml). */
function readNgrokApiKey() {
  const fromEnv = process.env.NGROK_API_KEY?.trim();
  if (fromEnv) return fromEnv;

  for (const configPath of ngrokConfigPaths()) {
    try {
      const content = fs.readFileSync(configPath, 'utf8');
      const match = content.match(/^\s*api_key:\s*(.+)$/m);
      if (match) {
        return match[1].trim().replace(/^['"]|['"]$/g, '');
      }
    } catch {
      /* sin archivo */
    }
  }
  return null;
}

function ngrokApiRequest(method, apiPath, apiKey, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: 'api.ngrok.com',
        path: apiPath,
        method,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Ngrok-Version': '2',
          Accept: 'application/json',
          ...(body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } : {}),
        },
        timeout: 12_000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          if (res.statusCode >= 400) {
            reject(new Error(data || `HTTP ${res.statusCode}`));
            return;
          }
          if (!data) {
            resolve(null);
            return;
          }
          try {
            resolve(JSON.parse(data));
          } catch (err) {
            reject(err);
          }
        });
      },
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    if (body) req.write(body);
    req.end();
  });
}

/** Cierra sesiones ngrok remotas (otro PC, agente huérfano en la nube). Requiere api_key. */
async function stopRemoteNgrokSessions(logFn = () => {}) {
  const apiKey = readNgrokApiKey();
  if (!apiKey) return 0;

  try {
    const data = await ngrokApiRequest('GET', '/tunnel_sessions', apiKey);
    const sessions = data?.tunnel_sessions || [];
    if (sessions.length === 0) return 0;

    logFn(`  Cerrando ${sessions.length} sesión(es) ngrok en la nube...`, 'yellow');
    for (const session of sessions) {
      if (!session?.id) continue;
      try {
        await ngrokApiRequest('POST', `/tunnel_sessions/${session.id}/stop`, apiKey);
        logFn(`  Sesión remota cerrada (${session.id.slice(0, 10)}...)`, 'dim');
      } catch {
        /* puede haber expirado entre list y stop */
      }
    }
    return sessions.length;
  } catch (err) {
    logFn(`  No se pudieron cerrar sesiones remotas: ${err.message}`, 'dim');
    return 0;
  }
}

/** Cierra procesos ngrok locales (evita ERR_NGROK_334 por dominio reservado duplicado). */
function killStaleNgrok(logFn = () => {}) {
  if (isWindows) {
    try {
      execSync('taskkill /IM ngrok.exe /F', { stdio: 'pipe' });
      logFn('  Sesión ngrok anterior cerrada', 'dim');
    } catch {
      /* sin procesos ngrok.exe */
    }
    try {
      execSync(
        'powershell -NoProfile -Command "Get-Process -Name ngrok -ErrorAction SilentlyContinue | Stop-Process -Force"',
        { stdio: 'pipe' },
      );
    } catch {
      /* ignorar */
    }
    return;
  }

  try {
    execSync('pkill -x ngrok 2>/dev/null || true', { stdio: 'pipe', shell: true });
    logFn('  Sesión ngrok anterior cerrada', 'dim');
  } catch {
    /* ignorar */
  }
}

module.exports = {
  isWindows,
  sleepMs,
  getListeningPids,
  freePort,
  freePorts,
  killProcessTree,
  killStaleDevRunners,
  killStaleNgrok,
  readNgrokApiKey,
  stopRemoteNgrokSessions,
  nukeDevEnvironment,
};
