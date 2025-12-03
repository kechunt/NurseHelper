# 🚀 Despliegue en Vercel - NurseHelper

## ✅ Build Local Verificado

El build funciona correctamente:
- ✅ Build completado sin errores
- ✅ Archivos generados en: `frontend/dist/NurseHelper/browser`
- ✅ Configuración de Vercel lista

## 📋 Pasos para Desplegar en Vercel

### ⚠️ IMPORTANTE: La carpeta `dist` está en GitHub

**La carpeta `frontend/dist` está incluida en el repositorio de GitHub** para que Vercel pueda verla y usarla directamente. Esto permite que Vercel pueda hacer deploy sin necesidad de construir el proyecto cada vez.

### ⚠️ CONFIGURACIÓN ACTUAL: Deploy Directo desde `dist`

**Los archivos `vercel.json` ya están configurados para deploy directo sin build.**

Como la carpeta `dist` ya está en GitHub, puedes hacer deploy directamente sin build:

1. **Ve a Vercel**
   - Visita: https://vercel.com
   - Inicia sesión con tu cuenta de GitHub

2. **Si es un proyecto nuevo:**
   - Click en "Add New Project"
   - Selecciona el repositorio: `kechunt/NurseHelper`
   - Click en "Import"

3. **Si ya tienes el proyecto configurado:**
   - Ve a tu proyecto en Vercel
   - Click en **"Settings"** → **"General"**
   - Busca la sección **"Root Directory"**

4. **Configuración del Proyecto** ⚠️ CRÍTICO - DEBE SER EXACTAMENTE ASÍ:
   - **Framework Preset**: "Other" (o déjalo en "Other")
   - **Root Directory**: `frontend` ⚠️ **DEBE SER `frontend`** (NO `.` ni raíz)
   - **Build Command**: **BORRA TODO** - Déjalo completamente vacío ⚠️
   - **Output Directory**: `dist/NurseHelper/browser` ⚠️ **DEBE SER EXACTAMENTE ESTO**
   - **Install Command**: **BORRA TODO** - Déjalo completamente vacío ⚠️
   
   **IMPORTANTE:**
   - ⚠️ Si Root Directory NO es `frontend`, cámbialo a `frontend`
   - ⚠️ Si Build Command tiene algo escrito, bórralo completamente
   - ⚠️ Si Install Command tiene algo escrito, bórralo completamente

5. **Guarda y Despliega**
   - Click en **"Save"** (Guardar)
   - Si ya existe un deployment, ve a **"Deployments"** → Click en los tres puntos (⋯) → **"Redeploy"**
   - Si es nuevo, click en **"Deploy"**
   - Vercel usará directamente los archivos de `dist` sin construir

### Opción Alternativa: Build Automático (No Recomendado - Solo si necesitas)

**NOTA:** Esta opción requiere modificar los archivos `vercel.json`. Actualmente están configurados para deploy directo.

Si prefieres que Vercel construya el proyecto automáticamente, necesitarías:
1. Cambiar el Root Directory a `.` (raíz)
2. Agregar build commands en vercel.json
3. Pero esto es más lento y propenso a errores

**Recomendación:** Usa la Opción 1 (Deploy Directo) que es más rápida y confiable.

### Opción 3: Desde la Terminal (CLI)

**⚠️ IMPORTANTE:** Si el Root Directory en Vercel está configurado como `frontend`, ejecuta desde la **RAÍZ** del proyecto, NO desde `frontend`:

```bash
# Instala Vercel CLI (si no lo tienes)
npm install -g vercel

# Ve a la RAÍZ del proyecto (NO al directorio frontend)
cd /Users/kechunt/Documents/Angular/NurseHelper

# Inicia sesión en Vercel (si no lo has hecho)
vercel login

# Despliega desde la raíz
vercel

# Para producción
vercel --prod
```

**❌ NO hagas esto:**
```bash
cd frontend  # ❌ NO ejecutes desde aquí si Root Directory = frontend
vercel --prod  # Esto causará el error "frontend/frontend does not exist"
```

**✅ Haz esto:**
```bash
cd /Users/kechunt/Documents/Angular/NurseHelper  # ✅ Desde la raíz
vercel --prod  # Esto funcionará correctamente
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

## 🔧 Solución de Problemas

### ⚠️ ERROR CRÍTICO: `sh: line 1: cd: frontend: No such file or directory`

**Causa:** Vercel está usando comandos guardados en la UI del proyecto que intentan ejecutar `cd frontend && npm install && npm run build`, pero estos comandos están causando el error.

**Solución Paso a Paso (MUY IMPORTANTE):**

1. **Ve a la configuración de tu proyecto en Vercel**
   - Abre: https://vercel.com/kechunts-projects/nurse-helper/settings
   - O ve a: https://vercel.com → Tu proyecto → **"Settings"** → **"General"**

2. **Busca la sección "Build & Development Settings"**
   - Desplázate hasta encontrar **"Build Command"**
   - **BORRA COMPLETAMENTE** todo lo que diga ahí (probablemente dice: `cd frontend && npm install && npm run build`)
   - Déjalo **COMPLETAMENTE VACÍO** ⚠️

3. **Busca "Install Command"**
   - **BORRA COMPLETAMENTE** todo lo que diga ahí (probablemente dice: `cd frontend && npm install` o `npm install`)
   - Déjalo **COMPLETAMENTE VACÍO** ⚠️

4. **Configura "Root Directory"**
   - Busca **"Root Directory"**
   - Cámbialo a: `frontend` ⚠️ (debe decir exactamente `frontend`, sin espacios)

5. **Configura "Output Directory"**
   - Busca **"Output Directory"**
   - Escríbelo exactamente así: `dist/NurseHelper/browser` ⚠️

6. **Guarda los cambios**
   - Click en **"Save"** (Guardar) al final de la página
   - Espera a que se guarde (verás un mensaje de confirmación)

7. **Redespliega**
   - Ve a la pestaña **"Deployments"** (Despliegues)
   - Click en los tres puntos (⋯) del último deployment fallido
   - Selecciona **"Redeploy"** (Redesplegar)
   - O simplemente haz un nuevo commit y push para que se redespliegue automáticamente

### Verificación rápida:

- ✅ **Opción A (Deploy Directo):**
  - Root Directory = `frontend`
  - Build Command = **VACÍO**
  - Output Directory = `dist/NurseHelper/browser`
  
- ✅ **Opción B (Build Automático):**
  - Root Directory = `.` (raíz)
  - Build Command = **VACÍO** (usa vercel.json)
  - Output Directory = **VACÍO** (usa vercel.json)

## ❓ Pregunta Frecuente: ¿Por qué no veo la carpeta `dist` en Vercel?

**Respuesta:** La carpeta `frontend/dist` está incluida en GitHub y debería ser visible en Vercel. Si no la ves, verifica que:
1. Los archivos de `frontend/dist` estén en el repositorio de GitHub
2. El Root Directory en Vercel esté configurado correctamente (`.` o `frontend`)
3. El Output Directory apunte a `frontend/dist/NurseHelper/browser` o `dist/NurseHelper/browser` según tu Root Directory

### ¿Cómo funciona Vercel?

1. **Vercel clona tu repositorio de GitHub** (sin la carpeta `dist`)
2. **Vercel ejecuta el Build Command** que está en `vercel.json`:
   ```bash
   cd frontend && npm install && npm run build
   ```
3. **Vercel crea la carpeta `dist` automáticamente** durante el build
4. **Vercel usa el Output Directory** especificado en `vercel.json`:
   ```
   frontend/dist/NurseHelper/browser
   ```
5. **Vercel despliega los archivos** de esa carpeta

### ¿Qué debes hacer?

✅ **NO necesitas hacer nada especial** - Solo configura Vercel con:
- **Root Directory**: `.` (raíz) o `frontend`
- **Build Command**: Ya está en `vercel.json` o usa `npm run build` si Root Directory es `frontend`
- **Output Directory**: Ya está en `vercel.json` o usa `dist/NurseHelper/browser` si Root Directory es `frontend`

❌ **NO intentes**:
- Subir la carpeta `dist` a GitHub (está en `.gitignore` por una razón)
- Seleccionar manualmente la carpeta `dist` en Vercel (no existe en GitHub)
- Modificar el `.gitignore` para incluir `dist` (no es necesario)

## 📝 Notas Importantes

- ✅ El build funciona correctamente localmente
- ✅ La configuración de Vercel está lista
- ✅ La carpeta `dist` NO debe estar en GitHub (está en `.gitignore`)
- ✅ Vercel construirá el proyecto automáticamente durante el deploy
- ⚠️ Recuerda actualizar `environment.prod.ts` con la URL real de tu backend
- ⚠️ Asegúrate de que tu backend en Railway esté funcionando

## 🔗 URLs después del Deploy

- **Frontend**: `https://tu-proyecto.vercel.app`
- **Backend**: `https://tu-backend.railway.app`
- **API Docs**: `https://tu-backend.railway.app/api-docs`


