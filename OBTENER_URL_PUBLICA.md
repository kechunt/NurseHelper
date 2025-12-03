# 🌐 Cómo Obtener la URL Pública del Backend en Railway

## ⚠️ Importante

La URL `nursehelper.railway.internal` es una **URL interna** que solo funciona dentro de Railway. Necesitas la **URL pública** para que el frontend pueda conectarse.

## 🔍 Pasos para Obtener la URL Pública

### Paso 1: Ve a Railway

1. Abre: https://railway.app
2. Inicia sesión
3. Ve a tu proyecto donde está el backend

### Paso 2: Encuentra el Servicio del Backend

1. Click en el servicio del backend (no el de MySQL)
2. Ve a la pestaña **"Settings"** o **"Configuración"**

### Paso 3: Busca "Networking" o "Public Domain"

1. Desplázate hasta encontrar la sección **"Networking"** o **"Networking & Domains"**
2. Busca **"Public Domain"** o **"Generate Domain"**

### Paso 4: Genera o Copia el Dominio Público

**Si NO hay dominio público:**
1. Click en **"Generate Domain"** o **"Generate Public URL"**
2. Railway creará una URL como:
   - `https://nursehelper-production.up.railway.app`
   - `https://nursehelper-backend.up.railway.app`
   - O similar

**Si YA hay un dominio público:**
1. Copia la URL que aparece (debería empezar con `https://`)

### Paso 5: Verifica que Funcione

Abre en tu navegador la URL pública con `/health`:
```
https://TU-URL-PUBLICA.railway.app/health
```

Deberías ver:
```json
{"status":"ok","message":"NurseHelper API funcionando"}
```

Si funciona, esa es la URL que necesitas.

## 📋 URL Interna vs URL Pública

| Tipo | Ejemplo | ¿Funciona desde Internet? |
|------|---------|---------------------------|
| **Interna** | `nursehelper.railway.internal` | ❌ NO - Solo dentro de Railway |
| **Pública** | `https://nursehelper-production.up.railway.app` | ✅ SÍ - Accesible desde cualquier lugar |

## 🔧 Si No Puedes Encontrar la URL Pública

### Opción 1: Verificar en los Logs

1. Ve a tu servicio del backend
2. Click en **"Deployments"**
3. Click en el deployment más reciente
4. Click en **"View Logs"**
5. Busca líneas que digan:
   - `Server running on...`
   - `Public URL: ...`
   - O similar

### Opción 2: Verificar Variables de Entorno

1. Ve a **"Variables"** en tu servicio del backend
2. Busca variables como:
   - `RAILWAY_PUBLIC_DOMAIN`
   - `PUBLIC_URL`
   - O similar

### Opción 3: Crear Dominio Público Manualmente

1. En **"Settings"** → **"Networking"**
2. Si no hay opción para generar dominio, puede que necesites:
   - Actualizar el plan de Railway (algunos planes gratuitos tienen limitaciones)
   - O usar otra plataforma como Render

## ✅ Una Vez que Tengas la URL Pública

1. Copia la URL completa (ejemplo: `https://nursehelper-production.up.railway.app`)
2. Actualiza `frontend/src/environments/environment.prod.ts`:
   ```typescript
   export const environment = {
     production: true,
     apiUrl: 'https://TU-URL-PUBLICA.railway.app/api'
   };
   ```
3. Haz commit y push
4. Vercel hará deploy automáticamente

## 🆘 Si Railway No Te Permite Crear Dominio Público

Si Railway no te permite generar un dominio público (puede pasar en planes gratuitos), puedes usar:

### Alternativa: Render (Gratis)

1. Ve a: https://render.com
2. Crea cuenta gratuita
3. **"New +"** → **"Web Service"**
4. Conecta tu repositorio de GitHub
5. Configura:
   - **Build Command**: `cd backend && npm install && npm run build`
   - **Start Command**: `cd backend && npm start`
6. Agrega las mismas variables de entorno
7. Render te dará una URL pública automáticamente

