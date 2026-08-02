import { GENERATED_API_URL } from './api-url.generated';

/**
 * `apiUrl` se define en build: ejecuta `node scripts/write-api-url.mjs` (lo hace `npm run build`).
 * Configura **NG_APP_API_URL** (p. ej. `/api` en Docker o `https://tu-dominio.com` sin `/api` final; el script añade `/api`).
 */
export const environment = {
  production: true,
  apiUrl: GENERATED_API_URL,
};

