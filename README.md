# NurseHelper

Sistema de gestión clínica para enfermería, farmacia y administración — Angular 20 + Express/TypeORM/MySQL.

## Requisitos

- Node.js 20+
- MySQL 8+
- npm 9+

## Inicio rápido

```bash
# 1. Instalar dependencias (raíz, backend y frontend)
npm run install:all

# 2. Configurar entorno
cp backend/.env.example backend/.env.local
# Edita backend/.env.local con tus credenciales MySQL y JWT_SECRET

# 3. Migraciones y arranque
npm run migration:run
npm run dev
```

- Frontend: http://localhost:4200  
- Backend API: http://localhost:3000  
- Health: http://localhost:3000/health  

## Scripts útiles (raíz)

| Script | Descripción |
|--------|-------------|
| `npm run dev` | Backend + frontend en paralelo |
| `npm run tunnel` | Túnel ngrok para demo remota |
| `npm run build` | Compila backend y frontend |
| `npm test` | Tests backend + frontend (headless) |
| `npm run test:backend` | Solo Jest (backend) |
| `npm run test:frontend` | Karma + Playwright E2E |
| `npm run lint` | ESLint en backend y frontend |
| `npm run migration:run` | Ejecuta migraciones TypeORM |

## Roles y rutas

| Rol | Ruta frontend |
|-----|----------------|
| Admin | `/admin` |
| Supervisor | `/supervisor` |
| Enfermería | `/nurse-dashboard` |
| Farmacia | `/pharmacy` |

El registro público crea usuarios solo con rol **enfermería**; otros roles los asigna un administrador.

## Documentación

- [Funcionalidad del proyecto](docs/FUNCIONALIDAD_PROYECTO.md)
- [Recomendaciones técnicas](docs/RECOMENDACIONES.md)
- [Backend](backend/README.md)
- [Frontend / mejoras pendientes](frontend/docs/MEJORAS_PENDIENTES.md)

## CI

El workflow unificado en `.github/workflows/ci-cd.yml` ejecuta build, tests, lint y E2E (API mockeada) en cada PR a `main`/`develop`.

## Despliegue

- **Frontend:** Vercel (`frontend/`)
- **Backend:** Railway u otro host Node (`backend/`)

Configura `JWT_SECRET`, `FIELD_ENCRYPTION_KEY` y variables `DB_*` en producción antes de ejecutar migraciones.
