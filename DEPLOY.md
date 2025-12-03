# Guía de Despliegue - NurseHelper

## 📦 Subir a GitHub

### 1. Crear repositorio en GitHub
1. Ve a [GitHub](https://github.com) y crea un nuevo repositorio
2. No inicialices con README, .gitignore o licencia (ya los tienes)

### 2. Conectar tu repositorio local con GitHub

```bash
# Asegúrate de estar en la raíz del proyecto
cd /Users/kechunt/Documents/Angular/NurseHelper

# Agrega el remoto (reemplaza TU_USUARIO y TU_REPOSITORIO)
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git

# Verifica que el .env esté en .gitignore (ya está configurado)
git status

# Agrega todos los archivos
git add .

# Haz commit
git commit -m "Initial commit: NurseHelper project"

# Sube a GitHub
git branch -M main
git push -u origin main
```

## 🚀 Desplegar Frontend en Vercel

### Opción 1: Desde GitHub (Recomendado)

1. **Sube tu código a GitHub** (sigue los pasos anteriores)

2. **Ve a Vercel**
   - Visita [vercel.com](https://vercel.com)
   - Inicia sesión con tu cuenta de GitHub

3. **Importa el proyecto**
   - Click en "Add New Project"
   - Selecciona tu repositorio de GitHub
   - Vercel detectará automáticamente Angular

4. **Configuración del proyecto**
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist/NurseHelper/browser`
   - **Install Command**: `npm install`

5. **Variables de entorno** (si las necesitas)
   - Agrega variables como `API_URL` si tu frontend las requiere

6. **Deploy**
   - Click en "Deploy"
   - Espera a que termine el despliegue

### Opción 2: Desde la línea de comandos

```bash
# Instala Vercel CLI globalmente
npm install -g vercel

# En la raíz del proyecto
cd /Users/kechunt/Documents/Angular/NurseHelper

# Inicia sesión en Vercel
vercel login

# Despliega
vercel

# Para producción
vercel --prod
```

## 🔧 Configuración del Backend en Railway

El backend ya está configurado para Railway. Solo necesitas:

1. **Variables de entorno en Railway**
   - Ve a tu proyecto en Railway
   - Agrega las variables de entorno desde el panel de configuración
   - O usa el archivo `.env` que ya tienes configurado

2. **Actualizar la URL del API en el frontend**
   - En `frontend/src/environments/environment.prod.ts`
   - Cambia la URL del API a la URL de tu backend en Railway

## 📝 Notas Importantes

- ✅ El archivo `.env` está en `.gitignore` y NO se subirá a GitHub
- ✅ Los `node_modules` están ignorados
- ✅ El `dist` está ignorado
- ⚠️ Asegúrate de configurar las variables de entorno en Vercel/Railway
- ⚠️ Actualiza las URLs del API en los archivos de environment

## 🔗 URLs después del despliegue

- **Frontend**: `https://tu-proyecto.vercel.app`
- **Backend**: `https://tu-backend.railway.app`
- **API Docs**: `https://tu-backend.railway.app/api-docs`

