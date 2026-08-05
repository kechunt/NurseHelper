/**
 * Utilidades de puertos (macOS, Linux, Windows).
 * Usado por start-dev.js
 */

const { execSync } = require('child_process');

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

module.exports = {
  isWindows,
  freePort,
};
