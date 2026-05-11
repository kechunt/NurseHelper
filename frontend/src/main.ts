import '@angular/localize';
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => {
    console.error('❌ Error al iniciar la aplicación:', err);
    // Mostrar error en la página si es posible
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position: fixed; top: 0; left: 0; right: 0; background: #f44336; color: white; padding: 20px; z-index: 10000; font-family: monospace;';
    errorDiv.innerHTML = `
      <h2>❌ Error al cargar la aplicación</h2>
      <p>${err.message || 'Error desconocido'}</p>
      <p>Revisa la consola del navegador para más detalles.</p>
    `;
    document.body.appendChild(errorDiv);
    throw err;
  });
