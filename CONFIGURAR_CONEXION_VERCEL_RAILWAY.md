# 🔗 Configurar Conexión Vercel ↔ Railway

## 📋 Pasos para Conectar Frontend (Vercel) con Backend (Railway)

### Paso 1: Obtener URL Pública del Backend en Railway

1. Ve a: https://railway.app
2. Abre tu proyecto
3. Click en el servicio del **backend** (no MySQL)
4. Ve a **"Settings"** → **"Networking"**
5. Busca **"Public Domain"** o click en **"Generate Domain"**
6. Copia la URL pública (ejemplo: `https://nursehelper-production.up.railway.app`)

⚠️ **IMPORTANTE**: Debe ser una URL pública que empiece con `https://`, NO `railway.internal`

### Paso 2: Configurar CORS en Railway (Backend)

En Railway, ve a tu servicio del backend → **"Variables"**:

Agrega o actualiza:

**Key**: `CORS_ORIGIN`  
**Value**: 
```
https://nurse-helper-q191e1j05-kechunts-projects.vercel.app,https://*.vercel.app
```

O si quieres ser más específico:
```
https://nurse-helper-q191e1j05-kechunts-projects.vercel.app
```

**Otras variables importantes:**
```
DB_HOST=ballast.proxy.rlwy.net
DB_PORT=59092
DB_USERNAME=root
DB_PASSWORD=HtsZucTTXEBdlFQcutaggcheqzVGDYwW
DB_DATABASE=railway
NODE_ENV=production
JWT_SECRET=tu-clave-secreta-muy-larga-y-aleatoria
PORT=3000
```

### Paso 3: Actualizar Frontend con URL del Backend

Edita `frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://TU-URL-BACKEND.railway.app/api'
};
```

**Ejemplo:**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://nursehelper-production.up.railway.app/api'
};
```

⚠️ **IMPORTANTE**: Incluye `/api` al final de la URL.

### Paso 4: Hacer Deploy

**Backend (Railway):**
- Después de agregar las variables, Railway redesplegará automáticamente
- O puedes hacer "Redeploy" manualmente

**Frontend (Vercel):**
```bash
cd /Users/kechunt/Documents/Angular/NurseHelper
git add frontend/src/environments/environment.prod.ts
git commit -m "fix: Actualizar URL del backend para producción"
git push origin main
```

Vercel hará deploy automáticamente.

### Paso 5: Verificar la Conexión

1. **Verifica que el Backend funcione:**
   ```
   https://TU-URL-BACKEND.railway.app/health
   ```
   Deberías ver: `{"status":"ok","message":"NurseHelper API funcionando"}`

2. **Verifica que el Frontend se conecte:**
   - Abre tu app en Vercel
   - Abre la consola del navegador (F12)
   - Intenta hacer login
   - En la consola deberías ver:
     ```
     🔐 Intentando login en: https://TU-URL-BACKEND.railway.app/api/auth/login
     📍 API URL base: https://TU-URL-BACKEND.railway.app/api
     ```

## 🔍 Verificación de CORS

Si ves errores de CORS en la consola del navegador:

1. Verifica que `CORS_ORIGIN` en Railway incluya tu URL de Vercel
2. Verifica que el backend se haya redesplegado después de cambiar las variables
3. Revisa los logs del backend en Railway para ver si hay warnings de CORS

## 🐛 Problemas Comunes

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Solución**: 
- Verifica que `CORS_ORIGIN` en Railway incluya tu URL de Vercel
- Asegúrate de que el backend se haya redesplegado

### Error: "Failed to fetch" o "Network Error"
**Solución**: 
- Verifica que la URL del backend sea correcta
- Verifica que el backend esté funcionando (`/health`)
- Verifica que la URL termine en `/api`

### Error: "404 Not Found"
**Solución**: 
- Verifica que la URL termine en `/api`
- Verifica que el endpoint sea correcto (`/api/auth/login`)

## ✅ Checklist Final

- [ ] URL pública del backend obtenida de Railway
- [ ] Variable `CORS_ORIGIN` configurada en Railway con URL de Vercel
- [ ] `environment.prod.ts` actualizado con URL del backend
- [ ] Backend redesplegado en Railway
- [ ] Frontend redesplegado en Vercel (commit y push)
- [ ] Backend responde en `/health`
- [ ] Frontend se conecta correctamente (verificar consola)

