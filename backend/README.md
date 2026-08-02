# Backend (API NurseHelper)

API Express + TypeORM + MySQL. Arranque habitual desde la raíz: `npm run dev` (aplica migraciones y arranca frontend+backend).

## MySQL y variables de conexión

El mismo `AppDataSource` usa estas variables (ver `src/data-source.ts`; la carga de `.env` está en `src/utils/env.ts` → `loadEnv()`):

| Variable       | Ejemplo local | Descripción        |
|----------------|---------------|--------------------|
| `DB_HOST`      | `localhost`   | Host MySQL         |
| `DB_PORT`      | `3306`        | Puerto             |
| `DB_USERNAME`  | `root`        | Usuario            |
| `DB_PASSWORD`  | _(vacío o tu clave)_ | Contraseña |
| `DB_DATABASE`  | `nursehelper` | Base de datos      |

Prioridad de ficheros: `backend/.env.local` → raíz `.env.local` → `backend/.env` → raíz `.env`.

## Migraciones (obligatorio para pacientes y observaciones)

El detalle de paciente (`getPatientDetails`) y los endpoints de **observaciones clínicas** leen y escriben la tabla **`patient_clinical_notes`**. Si esa tabla no existe, verás `ER_NO_SUCH_TABLE`.

- **Desarrollo:** desde `backend/`: `npm run migration:run`  
- **Raíz del monorepo:** `npm run migration:run`  
- **Producción (build compilado):** `npm run migration:run:prod`

Tras desplegar código nuevo, asegúrate de que las migraciones se hayan ejecutado en **esa** base de datos.

**Nota:** `npm run dev:simple` en la raíz del monorepo **no** ejecuta migraciones; usa `npm run dev` o ejecuta `migration:run` a mano antes.

## Despliegue en producción

Usa Docker Compose desde la raíz del monorepo:

```bash
docker compose -f deployment/compose.production.yml up -d --build
```

Ver `deployment/backend.Dockerfile` y `deployment/compose.production.yml` para variables de entorno y health checks.

## App de pruebas (`app-test.ts`)

[`src/app-test.ts`](src/app-test.ts) exporta la instancia Express usada por los tests de integración con Supertest (sin levantar el servidor en un puerto real).
