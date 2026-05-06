import { test, expect } from '@playwright/test';

/** Paneles con `canActivate` por rol: sin token deben terminar en `/login`. */
const ROLE_PROTECTED_PATHS = ['/admin', '/supervisor', '/pharmacy'] as const;

test.describe('Rutas protegidas por rol (sin sesión)', () => {
  for (const path of ROLE_PROTECTED_PATHS) {
    test(`${path} redirige a login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
    });
  }
});
