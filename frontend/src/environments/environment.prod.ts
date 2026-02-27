// En Angular, las variables de entorno se inyectan en tiempo de build
// Para usar variables de entorno en Vercel, necesitas usar el prefijo NG_APP_
// Ejemplo: NG_APP_API_URL=https://tu-backend.railway.app/api

// Opción 1: Usar valor por defecto (reemplaza con tu URL de Railway)
export const environment = {
  production: true,
  apiUrl: 'https://nursehelper-production.up.railway.app/api'
};

