/**
 * Escribe `src/environments/api-url.generated.ts` antes del build.
 * Define NG_APP_API_URL (p. ej. `/api` en Docker o `https://tu-dominio.com/api`).
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dest = path.join(__dirname, '..', 'src', 'environments', 'api-url.generated.ts');

let u = (process.env.NG_APP_API_URL || process.env.API_PUBLIC_URL || '').trim();
if (!u) {
  u = '/api';
}
u = u.replace(/\/+$/, '');
if (!u.endsWith('/api')) {
  u = `${u}/api`;
}

const body = `/* Generado por scripts/write-api-url.mjs — no editar a mano */\nexport const GENERATED_API_URL = ${JSON.stringify(u)} as const;\n`;

fs.writeFileSync(dest, body, 'utf8');
console.log('[write-api-url] apiUrl →', u);
