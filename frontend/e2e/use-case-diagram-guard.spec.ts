import { test, expect } from '@playwright/test';

test.describe('Diagrama de casos de uso (auth)', () => {
  test('sin sesión activa /use-case-diagram lleva a login', async ({ page }) => {
    await page.goto('/use-case-diagram');
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
  });
});
