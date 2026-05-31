#!/usr/bin/env node

/**
 * Detiene ngrok local y sesiones remotas de la cuenta.
 * Uso: npm run tunnel:stop
 */

const { execSync } = require('child_process');
const {
  isWindows,
  killStaleNgrok,
  stopRemoteNgrokSessions,
  readNgrokApiKey,
  nukeDevEnvironment,
} = require('./port-utils');

const REPO_ROOT = require('path').join(__dirname, '..');

async function main() {
  console.log('Deteniendo ngrok y servicios dev de NurseHelper...\n');

  killStaleNgrok((msg) => console.log(`  ${msg}`));

  if (isWindows) {
    try {
      execSync(
        'powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter \\"Name = \'node.exe\'\\" | Where-Object { $_.CommandLine -like \'*tunnel.js*\' -or $_.CommandLine -like \'*start-dev.js*\' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }"',
        { stdio: 'pipe' },
      );
    } catch {
      /* sin procesos */
    }
  }

  try {
    nukeDevEnvironment([3000, 4200], REPO_ROOT, (msg) => console.log(`  ${msg}`));
  } catch {
    /* ignorar */
  }

  const stopped = await stopRemoteNgrokSessions((msg) => console.log(`  ${msg}`));
  if (stopped === 0 && !readNgrokApiKey()) {
    console.log('\n  Sin api_key: cierra sesiones en https://dashboard.ngrok.com/tunnels/agents');
  } else if (stopped === 0) {
    console.log('\n  No había sesiones ngrok activas en la nube.');
  } else {
    console.log(`\n  ${stopped} sesión(es) remota(s) cerrada(s).`);
  }

  console.log('\nListo.');
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});
