# 🔍 Cómo Encontrar la URL de tu Backend en Railway

## 📋 Pasos para Encontrar la URL del Backend API

### Paso 1: Ve a Railway

1. Abre: https://railway.app
2. Inicia sesión con tu cuenta
3. Busca tu proyecto del backend (NurseHelper Backend)

### Paso 2: Encuentra la URL del Servicio

1. Click en tu servicio del backend
2. Ve a la pestaña **"Settings"** o **"Configuración"**
3. Busca la sección **"Networking"** o **"Red"**
4. Busca **"Public Domain"** o **"Dominio Público"**

La URL debería verse algo así:
- `https://nurse-helper-backend-production.up.railway.app`
- `https://nurse-helper-backend.railway.app`
- O similar

### Paso 3: Verifica que el Backend Funcione

Abre en tu navegador:
```
https://TU-URL-BACKEND.railway.app/health
```

O para ver la documentación:
```
https://TU-URL-BACKEND.railway.app/api-docs
```

Si ves una respuesta JSON o la documentación de Swagger, el backend está funcionando.

## ⚠️ IMPORTANTE

La URL que necesitas es la del **servicio HTTP del backend**, NO la de la base de datos MySQL.

- ✅ **URL del Backend API**: `https://tu-backend.railway.app`
- ❌ **URL de MySQL**: `mysql://root:...@ballast.proxy.rlwy.net:59092/railway` (esta NO es la que necesitas)

## 🔧 Una vez que tengas la URL

1. Actualiza `frontend/src/environments/environment.prod.ts` con la URL completa:
   ```typescript
   apiUrl: 'https://TU-URL-BACKEND.railway.app/api'
   ```

2. Configura CORS en Railway:
   - Ve a tu proyecto backend en Railway
   - Click en "Variables"
   - Agrega o actualiza:
     - **Key**: `CORS_ORIGIN`
     - **Value**: `https://nurse-helper-q191e1j05-kechunts-projects.vercel.app`

3. Haz commit y push:
   ```bash
   git add frontend/src/environments/environment.prod.ts
   git commit -m "fix: Actualizar URL del backend"
   git push origin main
   ```

