# 🚀 Desplegar Backend en Railway

## ✅ Opción 1: Railway (RECOMENDADO - Más Fácil)

Ya tienes MySQL en Railway, así que agregar el backend es muy fácil.

### Paso 1: Preparar el Backend para Railway

1. **Crea un archivo `railway.json` en la raíz del proyecto** (opcional, para configuración):
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd backend && npm run build && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

2. **Crea un archivo `Procfile` en la raíz del proyecto** (alternativa):
```
web: cd backend && npm run build && npm start
```

### Paso 2: Subir el Backend a Railway

**Opción A: Desde GitHub (Recomendado)**

1. Asegúrate de que tu código esté en GitHub
2. Ve a Railway: https://railway.app
3. Click en **"New Project"**
4. Selecciona **"Deploy from GitHub repo"**
5. Selecciona tu repositorio: `kechunt/NurseHelper`
6. Railway detectará automáticamente el proyecto

**Opción B: Desde la Terminal**

1. Instala Railway CLI:
```bash
npm install -g @railway/cli
railway login
```

2. En la raíz del proyecto:
```bash
cd /Users/kechunt/Documents/Angular/NurseHelper
railway init
railway up
```

### Paso 3: Configurar el Servicio del Backend

1. En Railway, después de crear el proyecto:
2. Click en **"New Service"** o **"Add Service"**
3. Selecciona **"GitHub Repo"** o **"Empty Service"**
4. Si usas GitHub, selecciona tu repositorio

### Paso 4: Configurar Variables de Entorno

En Railway, ve a tu servicio del backend → **"Variables"**:

1. **Conectar a MySQL existente:**
   - Click en **"Add Variable"**
   - Busca tu servicio MySQL y selecciona **"Add Reference"**
   - Railway creará automáticamente variables como:
     - `MYSQL_HOST`
     - `MYSQL_PORT`
     - `MYSQL_USER`
     - `MYSQL_PASSWORD`
     - `MYSQL_DATABASE`

2. **Configurar variables para TypeORM:**
   Agrega estas variables (Railway las creará automáticamente si conectas MySQL):
   ```
   DB_HOST=${MYSQL_HOST}
   DB_PORT=${MYSQL_PORT}
   DB_USERNAME=${MYSQL_USER}
   DB_PASSWORD=${MYSQL_PASSWORD}
   DB_DATABASE=${MYSQL_DATABASE}
   ```

   O si Railway no las crea automáticamente, usa los valores de tu conexión MySQL:
   ```
   DB_HOST=ballast.proxy.rlwy.net
   DB_PORT=59092
   DB_USERNAME=root
   DB_PASSWORD=HtsZucTTXEBdlFQcutaggcheqzVGDYwW
   DB_DATABASE=railway
   ```

3. **Otras variables importantes:**
   ```
   NODE_ENV=production
   PORT=3000
   JWT_SECRET=tu-secret-key-muy-segura-aqui
   CORS_ORIGIN=https://nurse-helper-q191e1j05-kechunts-projects.vercel.app
   ```

### Paso 5: Configurar el Build y Start

En Railway, ve a tu servicio → **"Settings"** → **"Deploy"**:

- **Root Directory**: `backend` (si el backend está en una carpeta)
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

O si está en la raíz:
- **Build Command**: `cd backend && npm install && npm run build`
- **Start Command**: `cd backend && npm start`

### Paso 6: Ejecutar Migraciones

Después del primer deploy, ejecuta las migraciones:

1. En Railway, ve a tu servicio del backend
2. Click en **"Deployments"**
3. Click en los tres puntos (⋯) del deployment activo
4. Click en **"View Logs"**
5. O usa Railway CLI:
```bash
railway run --service backend npm run migration:run
```

### Paso 7: Obtener la URL del Backend

1. En Railway, ve a tu servicio del backend
2. Click en **"Settings"**
3. Busca **"Networking"** o **"Public Domain"**
4. Click en **"Generate Domain"** si no hay uno
5. Copia la URL (ejemplo: `https://nurse-helper-backend-production.up.railway.app`)

### Paso 8: Actualizar el Frontend

Actualiza `frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://TU-URL-BACKEND.railway.app/api'
};
```

## 🔧 Opción 2: Render (Alternativa)

### Paso 1: Crear cuenta en Render

1. Ve a: https://render.com
2. Crea una cuenta (puedes usar GitHub)

### Paso 2: Crear Web Service

1. Click en **"New +"** → **"Web Service"**
2. Conecta tu repositorio de GitHub
3. Selecciona el repositorio: `kechunt/NurseHelper`

### Paso 3: Configurar el Servicio

- **Name**: `nurse-helper-backend`
- **Environment**: `Node`
- **Build Command**: `cd backend && npm install && npm run build`
- **Start Command**: `cd backend && npm start`
- **Root Directory**: (déjalo vacío o pon `backend`)

### Paso 4: Variables de Entorno

En **"Environment"**, agrega:

```
NODE_ENV=production
PORT=10000
DB_HOST=ballast.proxy.rlwy.net
DB_PORT=59092
DB_USERNAME=root
DB_PASSWORD=HtsZucTTXEBdlFQcutaggcheqzVGDYwW
DB_DATABASE=railway
JWT_SECRET=tu-secret-key-muy-segura
CORS_ORIGIN=https://nurse-helper-q191e1j05-kechunts-projects.vercel.app
```

### Paso 5: Deploy

Click en **"Create Web Service"** y Render hará el deploy automáticamente.

## 🔧 Opción 3: Fly.io (Alternativa)

### Paso 1: Instalar Fly CLI

```bash
curl -L https://fly.io/install.sh | sh
fly auth login
```

### Paso 2: Crear App

```bash
cd /Users/kechunt/Documents/Angular/NurseHelper/backend
fly launch
```

### Paso 3: Configurar Variables

```bash
fly secrets set DB_HOST=ballast.proxy.rlwy.net
fly secrets set DB_PORT=59092
fly secrets set DB_USERNAME=root
fly secrets set DB_PASSWORD=HtsZucTTXEBdlFQcutaggcheqzVGDYwW
fly secrets set DB_DATABASE=railway
fly secrets set JWT_SECRET=tu-secret-key
fly secrets set CORS_ORIGIN=https://nurse-helper-q191e1j05-kechunts-projects.vercel.app
```

### Paso 4: Deploy

```bash
fly deploy
```

## 📋 Resumen de Variables de Entorno Necesarias

Independientemente de la plataforma que uses, necesitas estas variables:

```
# Base de Datos (de tu MySQL en Railway)
DB_HOST=ballast.proxy.rlwy.net
DB_PORT=59092
DB_USERNAME=root
DB_PASSWORD=HtsZucTTXEBdlFQcutaggcheqzVGDYwW
DB_DATABASE=railway

# Aplicación
NODE_ENV=production
PORT=3000 (o el que use tu plataforma)

# Seguridad
JWT_SECRET=una-clave-secreta-muy-larga-y-aleatoria

# CORS
CORS_ORIGIN=https://nurse-helper-q191e1j05-kechunts-projects.vercel.app
```

## ✅ Recomendación

**Usa Railway** porque:
- ✅ Ya tienes MySQL ahí
- ✅ Es muy fácil conectar servicios
- ✅ Tiene plan gratuito generoso
- ✅ Es rápido y confiable

## 🚀 Después del Deploy

1. Obtén la URL del backend
2. Actualiza `frontend/src/environments/environment.prod.ts`
3. Haz commit y push
4. Vercel hará deploy automáticamente
5. ¡Listo! 🎉

