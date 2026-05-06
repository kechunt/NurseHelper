import { test, expect } from '@playwright/test';

/**
 * En desarrollo `designCatalogGuard` permite la ruta; en producción redirige a `/login`.
 * Esta prueba asume `ng serve` / configuración no production (Playwright `webServer` habitual).
 */
test.describe('Catálogo de diseño (solo desarrollo)', () => {
  test('/design-catalog muestra el catálogo neumórfico', async ({ page }) => {
    await page.goto('/design-catalog');
    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /Catálogo de diseño/ })).toBeVisible({
      timeout: 15000,
    });
  });
});
