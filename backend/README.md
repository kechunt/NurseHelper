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
- **Producción (build compilado):** `npm run migration:run:prod` (Railway ya lo ejecuta antes de `npm start` en `railway.json`).

Tras desplegar código nuevo, asegúrate de que las migraciones se hayan ejecutado en **esa** base de datos.

**Nota:** `npm run dev:simple` en la raíz del monorepo **no** ejecuta migraciones; usa `npm run dev` o ejecuta `migration:run` a mano antes.

## `backend/frontend/package.json`

Carpeta **`backend/frontend/`** con un `package.json` mínimo es un **stub de compatibilidad** para despliegues que esperan un comando de build de “frontend” dentro del árbol del backend (p. ej. configuraciones heredadas en Vercel). El script solo hace `echo` y **no construye** la app Angular (el frontend real está en `../frontend/`). **No lo borres** si tu pipeline o documentación de deploy lo referencian; si unifica el build, puedes eliminar la carpeta y actualizar la plataforma.
