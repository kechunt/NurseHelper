# 🔧 Configuración del Backend para Producción

## ⚠️ Problema Actual

El frontend en Vercel no puede conectarse al backend porque:
1. La URL del backend en `environment.prod.ts` está como placeholder
2. El backend necesita tener configurado CORS para permitir peticiones desde Vercel

## 📋 Pasos para Solucionar

### Paso 1: Obtener la URL de tu Backend

1. Ve a tu plataforma de hosting del backend (Railway, Render, etc.)
2. Copia la URL de producción de tu backend
   - Ejemplo Railway: `https://nurse-helper-backend.railway.app`
   - Ejemplo Render: `https://nurse-helper-backend.onrender.com`

### Paso 2: Actualizar `environment.prod.ts`

Edita el archivo `frontend/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://TU-BACKEND-URL.com/api' // Reemplaza con tu URL real
};
```

**Ejemplo:**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://nurse-helper-backend.railway.app/api'
};
```

### Paso 3: Configurar CORS en el Backend

El backend necesita permitir peticiones desde tu dominio de Vercel.

**Si usas Railway o similar con variables de entorno:**

1. Ve a la configuración de tu proyecto backend
2. Agrega o actualiza la variable de entorno:
   ```
   CORS_ORIGIN=https://tu-proyecto.vercel.app
   ```
   
   O si quieres permitir múltiples orígenes:
   ```
   CORS_ORIGIN=https://tu-proyecto.vercel.app,https://tu-dominio-custom.com
   ```

**Si el backend está en Railway:**

1. Ve a tu proyecto en Railway
2. Click en "Variables"
3. Agrega:
   - **Key**: `CORS_ORIGIN`
   - **Value**: `https://tu-proyecto.vercel.app` (reemplaza con tu URL de Vercel)

### Paso 4: Verificar que el Backend esté Funcionando

Abre en tu navegador:
```
https://TU-BACKEND-URL.com/api-docs
```

Deberías ver la documentación de Swagger. Si no aparece, el backend no está funcionando correctamente.

### Paso 5: Hacer Build y Deploy del Frontend

Después de actualizar `environment.prod.ts`:

```bash
cd /Users/kechunt/Documents/Angular/NurseHelper
git add frontend/src/environments/environment.prod.ts
git commit -m "fix: Actualizar URL del backend en producción"
git push origin main
```

Vercel hará deploy automáticamente con la nueva configuración.

## 🔍 Verificación

Después del deploy:

1. Abre la consola del navegador (F12) en tu app de Vercel
2. Intenta hacer login
3. Revisa la pestaña "Network" para ver las peticiones:
   - ✅ Deberías ver peticiones a `https://TU-BACKEND-URL.com/api/auth/login`
   - ❌ Si ves errores de CORS, verifica la variable `CORS_ORIGIN` en el backend

## 🐛 Errores Comunes

### Error: "CORS policy: No 'Access-Control-Allow-Origin' header"
**Solución**: Verifica que `CORS_ORIGIN` en el backend incluya tu URL de Vercel

### Error: "Network Error" o "Failed to fetch"
**Solución**: 
- Verifica que la URL del backend sea correcta
- Verifica que el backend esté funcionando (ve a `/api-docs`)
- Verifica que el backend tenga la variable `CORS_ORIGIN` configurada

### Error: "401 Unauthorized" o "Invalid credentials"
**Solución**: 
- Esto es normal si las credenciales son incorrectas
- Verifica que el backend tenga usuarios en la base de datos
- Verifica que la base de datos esté conectada correctamente

