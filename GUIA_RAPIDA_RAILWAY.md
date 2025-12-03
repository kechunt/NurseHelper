# 🚀 Guía Rápida: Desplegar Backend en Railway

## ⚡ Pasos Rápidos (5 minutos)

### 1. Ve a Railway
👉 https://railway.app

### 2. Crea Nuevo Proyecto
- Click en **"New Project"**
- Selecciona **"Deploy from GitHub repo"**
- Selecciona: `kechunt/NurseHelper`
- Railway detectará automáticamente el proyecto

### 3. Agrega Servicio del Backend
- Railway puede crear automáticamente un servicio
- O click en **"New Service"** → **"GitHub Repo"** → Selecciona tu repo

### 4. Configura el Servicio

En **Settings** del servicio del backend:

**Build & Deploy:**
- **Root Directory**: `backend`
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 5. Conecta a MySQL

1. En tu servicio del backend, ve a **"Variables"**
2. Click en **"New Variable"**
3. Busca tu servicio MySQL y click en **"Add Reference"**
4. Railway creará automáticamente:
   - `MYSQL_HOST`
   - `MYSQL_PORT`
   - `MYSQL_USER`
   - `MYSQL_PASSWORD`
   - `MYSQL_DATABASE`

### 6. Agrega Variables Adicionales

En **"Variables"**, agrega manualmente:

```
DB_HOST=${MYSQL_HOST}
DB_PORT=${MYSQL_PORT}
DB_USERNAME=${MYSQL_USER}
DB_PASSWORD=${MYSQL_PASSWORD}
DB_DATABASE=${MYSQL_DATABASE}
NODE_ENV=production
JWT_SECRET=tu-clave-secreta-muy-larga-y-aleatoria-aqui
CORS_ORIGIN=https://nurse-helper-q191e1j05-kechunts-projects.vercel.app
```

**O si Railway no crea las referencias automáticamente, usa directamente:**

```
DB_HOST=ballast.proxy.rlwy.net
DB_PORT=59092
DB_USERNAME=root
DB_PASSWORD=HtsZucTTXEBdlFQcutaggcheqzVGDYwW
DB_DATABASE=railway
NODE_ENV=production
JWT_SECRET=tu-clave-secreta-muy-larga-y-aleatoria-aqui
CORS_ORIGIN=https://nurse-helper-q191e1j05-kechunts-projects.vercel.app
```

### 7. Obtén la URL del Backend

1. En tu servicio del backend → **"Settings"**
2. Busca **"Networking"** o **"Public Domain"**
3. Click en **"Generate Domain"** si no hay uno
4. Copia la URL (ejemplo: `https://nurse-helper-backend-production.up.railway.app`)

### 8. Ejecuta Migraciones

Después del primer deploy:

**Opción A: Desde Railway Dashboard**
1. Ve a **"Deployments"**
2. Click en el deployment activo
3. Click en **"View Logs"**
4. Busca si hay errores de migración

**Opción B: Desde Terminal (Railway CLI)**
```bash
npm install -g @railway/cli
railway login
railway link  # Selecciona tu proyecto
railway run --service backend npm run migration:run
```

### 9. Actualiza el Frontend

Edita `frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://TU-URL-BACKEND.railway.app/api'
};
```

### 10. Deploy del Frontend

```bash
cd /Users/kechunt/Documents/Angular/NurseHelper
git add frontend/src/environments/environment.prod.ts
git commit -m "fix: Configurar URL del backend en producción"
git push origin main
```

Vercel hará deploy automáticamente.

## ✅ Verificación

1. **Backend Health Check:**
   ```
   https://TU-URL-BACKEND.railway.app/health
   ```
   Deberías ver: `{"status":"ok","message":"NurseHelper API funcionando"}`

2. **Backend API Docs:**
   ```
   https://TU-URL-BACKEND.railway.app/api-docs
   ```
   Deberías ver la documentación de Swagger

3. **Frontend Login:**
   - Abre tu app en Vercel
   - Intenta hacer login
   - Revisa la consola del navegador (F12) para ver si se conecta correctamente

## 🐛 Problemas Comunes

### Error: "Cannot connect to database"
**Solución**: Verifica que las variables `DB_*` estén correctamente configuradas

### Error: "Port already in use"
**Solución**: Railway usa el puerto automáticamente, no necesitas configurar PORT

### Error: "Migration failed"
**Solución**: Ejecuta las migraciones manualmente con Railway CLI

### Error: "CORS error"
**Solución**: Verifica que `CORS_ORIGIN` incluya tu URL de Vercel

## 📞 ¿Necesitas Ayuda?

Comparte:
1. La URL de tu backend en Railway
2. Los logs del deployment
3. Cualquier error que veas

