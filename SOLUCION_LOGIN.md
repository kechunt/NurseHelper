# 🔧 Solución para el Problema de Login

## 📋 Información Actual

- **Frontend**: https://nurse-helper-q191e1j05-kechunts-projects.vercel.app/
- **Backend MySQL**: `mysql://root:...@ballast.proxy.rlwy.net:59092/railway`
- **Backend API URL**: ❌ **FALTA** - Necesitas encontrarla en Railway

## 🔍 Paso 1: Encontrar la URL del Backend API en Railway

### Opción A: Desde Railway Dashboard

1. Ve a: https://railway.app
2. Inicia sesión
3. Click en tu proyecto del backend
4. Click en el servicio del backend (si tienes varios servicios)
5. Ve a la pestaña **"Settings"** o **"Variables"**
6. Busca **"Networking"** o **"Public Domain"**
7. Copia la URL que aparece (debería ser algo como):
   - `https://nurse-helper-backend-production.up.railway.app`
   - `https://nurse-helper-backend.railway.app`
   - O similar

### Opción B: Desde los Logs de Railway

1. Ve a tu proyecto en Railway
2. Click en el servicio del backend
3. Ve a la pestaña **"Deployments"** o **"Logs"**
4. Busca en los logs una línea que diga algo como:
   ```
   Server running on port 3000
   Public URL: https://tu-backend.railway.app
   ```

### Opción C: Verificar el Dominio Público

1. En Railway, ve a tu servicio del backend
2. Click en **"Settings"**
3. Busca la sección **"Networking"**
4. Deberías ver un **"Public Domain"** o **"Generate Domain"**
5. Si no hay dominio público, click en **"Generate Domain"**

## ✅ Paso 2: Verificar que el Backend Funcione

Una vez que tengas la URL, prueba estos endpoints:

1. **Health Check:**
   ```
   https://TU-URL-BACKEND.railway.app/health
   ```
   Deberías ver: `{"status":"ok","message":"NurseHelper API funcionando"}`

2. **Documentación Swagger:**
   ```
   https://TU-URL-BACKEND.railway.app/api-docs
   ```
   Deberías ver la documentación de la API

## 🔧 Paso 3: Actualizar environment.prod.ts

Una vez que tengas la URL del backend, actualiza el archivo:

**Archivo:** `frontend/src/environments/environment.prod.ts`

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://TU-URL-BACKEND.railway.app/api' // Reemplaza con tu URL real
};
```

**Ejemplo:**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://nurse-helper-backend-production.up.railway.app/api'
};
```

⚠️ **IMPORTANTE**: Asegúrate de incluir `/api` al final de la URL.

## 🔒 Paso 4: Configurar CORS en Railway

El backend necesita permitir peticiones desde tu frontend de Vercel.

1. Ve a tu proyecto backend en Railway
2. Click en **"Variables"** o **"Environment Variables"**
3. Busca o agrega la variable:
   - **Key**: `CORS_ORIGIN`
   - **Value**: `https://nurse-helper-q191e1j05-kechunts-projects.vercel.app`
   
   O si quieres permitir cualquier dominio de Vercel:
   ```
   https://nurse-helper-*.vercel.app
   ```

4. **Guarda** los cambios
5. El servicio se redesplegará automáticamente

## 🚀 Paso 5: Hacer Deploy del Frontend

Después de actualizar `environment.prod.ts`:

```bash
cd /Users/kechunt/Documents/Angular/NurseHelper
git add frontend/src/environments/environment.prod.ts
git add frontend/src/app/components/login/login.component.ts
git add frontend/src/app/services/auth.service.ts
git commit -m "fix: Configurar URL del backend y mejorar manejo de errores"
git push origin main
```

Vercel hará deploy automáticamente.

## 🔍 Paso 6: Verificar que Funcione

1. Abre tu app en Vercel: https://nurse-helper-q191e1j05-kechunts-projects.vercel.app/
2. Abre la **Consola del Navegador** (F12)
3. Ve a la pestaña **"Console"** o **"Consola"**
4. Intenta hacer login
5. Revisa los mensajes en la consola:
   - Deberías ver: `🔐 Intentando login en: https://TU-URL-BACKEND.railway.app/api/auth/login`
   - Si ves errores de CORS, verifica la variable `CORS_ORIGIN` en Railway
   - Si ves 404, verifica que la URL del backend sea correcta

## 🐛 Errores Comunes y Soluciones

### Error: "Failed to fetch" o "Network Error"
**Causa**: La URL del backend es incorrecta o el backend no está funcionando
**Solución**: 
- Verifica que la URL en `environment.prod.ts` sea correcta
- Verifica que el backend esté funcionando (ve a `/health`)

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Causa**: CORS no está configurado correctamente
**Solución**: 
- Verifica que `CORS_ORIGIN` en Railway incluya tu URL de Vercel
- Asegúrate de que el backend se haya redesplegado después de cambiar la variable

### Error: "404 Not Found"
**Causa**: La URL del endpoint es incorrecta
**Solución**: 
- Verifica que la URL termine en `/api` (ej: `https://backend.railway.app/api`)
- Verifica que el endpoint sea `/api/auth/login`

### Error: "401 Unauthorized"
**Causa**: Credenciales incorrectas (esto es normal si el usuario/contraseña es incorrecto)
**Solución**: 
- Verifica que el usuario exista en la base de datos
- Verifica que la contraseña sea correcta

## 📞 Si Necesitas Ayuda

Comparte conmigo:
1. La URL del backend que encontraste en Railway
2. Los mensajes de error que ves en la consola del navegador
3. Si el endpoint `/health` funciona cuando lo abres directamente

