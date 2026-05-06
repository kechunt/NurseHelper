import { test, expect } from '@playwright/test';

test.describe('Nurse dashboard / rutas protegidas', () => {
  test('sin sesión activa /nurse-dashboard lleva a login', async ({ page }) => {
    await page.goto('/nurse-dashboard');
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
  });

  test('sin sesión activa /dashboard redirige hacia nurse-dashboard y termina en login', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
  });
});
