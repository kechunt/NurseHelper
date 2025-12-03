# 🚀 Despliegue en Vercel - NurseHelper

## ✅ Build Local Verificado

El build funciona correctamente:
- ✅ Build completado sin errores
- ✅ Archivos generados en: `frontend/dist/NurseHelper/browser`
- ✅ Configuración de Vercel lista

## 📋 Pasos para Desplegar en Vercel

### Opción 1: Desde la Web (Recomendado)

1. **Ve a Vercel**
   - Visita: https://vercel.com
   - Inicia sesión con tu cuenta de GitHub

2. **Importa el Proyecto**
   - Click en "Add New Project"
   - Selecciona el repositorio: `kechunt/NurseHelper`
   - Click en "Import"

3. **Configuración del Proyecto**
   - **Framework Preset**: Angular (o déjalo en "Other")
   - **Root Directory**: `frontend` ⚠️ IMPORTANTE
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/NurseHelper/browser` ⚠️ IMPORTANTE
   - **Install Command**: `npm install` (por defecto)

4. **Variables de Entorno** (Opcional)
   - Si necesitas variables de entorno, agrégalas aquí
   - Ejemplo: `API_URL` si tu frontend la necesita

5. **Deploy**
   - Click en "Deploy"
   - Espera a que termine el proceso (2-3 minutos)

### Opción 2: Desde la Terminal

```bash
# Instala Vercel CLI (si no lo tienes)
npm install -g vercel

# Ve al directorio del frontend
cd frontend

# Inicia sesión en Vercel
vercel login

# Despliega
vercel

# Para producción
vercel --prod
```

## ⚙️ Configuración Actual

El archivo `vercel.json` en la raíz está configurado con:
- **Build Command**: `cd frontend && npm install && npm run build`
- **Output Directory**: `frontend/dist/NurseHelper/browser`
- **Rewrites**: Configurado para SPA (Single Page Application)

## 🔧 Verificación Post-Deploy

Después del despliegue:

1. **Verifica la URL**
   - Vercel te dará una URL como: `https://nursehelper.vercel.app`

2. **Actualiza el Backend**
   - Edita `frontend/src/environments/environment.prod.ts`
   - Cambia la URL del API a tu backend en Railway
   - Haz commit y push para que Vercel vuelva a desplegar

3. **Prueba la Aplicación**
   - Abre la URL de Vercel en tu navegador
   - Verifica que la aplicación carga correctamente
   - Prueba las funcionalidades principales

## 📝 Notas Importantes

- ✅ El build funciona correctamente localmente
- ✅ La configuración de Vercel está lista
- ⚠️ Recuerda actualizar `environment.prod.ts` con la URL real de tu backend
- ⚠️ Asegúrate de que tu backend en Railway esté funcionando

## 🔗 URLs después del Deploy

- **Frontend**: `https://tu-proyecto.vercel.app`
- **Backend**: `https://tu-backend.railway.app`
- **API Docs**: `https://tu-backend.railway.app/api-docs`

