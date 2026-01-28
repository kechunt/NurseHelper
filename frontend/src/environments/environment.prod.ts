// En Angular, las variables de entorno se inyectan en tiempo de build
// Para usar variables de entorno en Vercel, necesitas usar el prefijo NG_APP_
// Ejemplo: NG_APP_API_URL=https://tu-backend.railway.app/api

// Opción 1: Usar valor por defecto (reemplaza con tu URL de Railway)
export const environment = {
  production: true,
  apiUrl: 'https://nursehelper-production.up.railway.app/api'
};

// Opción 2: Si necesitas usar variables de entorno, descomenta esto y comenta lo de arriba
// Nota: Necesitarás configurar el build para inyectar las variables
// export const environment = {
//   production: true,
//   apiUrl: (window as any).__ENV__?.NG_APP_API_URL || 'https://nursehelper-production.up.railway.app/api'
// };

