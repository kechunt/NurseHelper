/**
 * Utilidades de puertos (macOS, Linux, Windows).
 * Usado por start-dev.js y tunnel.js
 */

const { execSync } = require('child_process');
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
      const out = execSync(`netstat -ano -p tcp | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      for (const line of out.split(/\r?\n/)) {
        if (!/LISTENING/i.test(line)) continue;
        const parts = line.trim().split(/\s+/);
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

module.exports = {
  isWindows,
  sleepMs,
  getListeningPids,
  freePort,
  freePorts,
  killProcessTree,
  killStaleDevRunners,
  nukeDevEnvironment,
};
