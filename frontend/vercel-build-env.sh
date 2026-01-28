#!/bin/bash
# Script para inyectar variables de entorno en el build de Angular para Vercel
# Este script se ejecuta antes del build en Vercel

# Crear archivo de environment con la variable de entorno de Vercel
cat > src/environments/environment.prod.ts << EOF
export const environment = {
  production: true,
  apiUrl: '${NG_APP_API_URL:-https://nursehelper-production.up.railway.app/api}'
};
EOF

echo "✅ Environment file creado con API URL: ${NG_APP_API_URL:-https://nursehelper-production.up.railway.app/api}"
