import { test, expect } from '@playwright/test';

test.describe('Login Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('debería mostrar el formulario de login', async ({ page }) => {
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('debería mostrar error con credenciales inválidas', async ({ page }) => {
    await page.fill('input[type="text"]', 'usuario_inexistente');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Esperar mensaje de error
    await expect(page.locator('.error-message, [role="alert"]')).toBeVisible({ timeout: 5000 });
  });

  test('debería redirigir al dashboard con credenciales válidas', async ({ page }) => {
    // Nota: Requiere datos de prueba en la BD
    await page.fill('input[type="text"]', 'admin');
    await page.fill('input[type="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Esperar redirección
    await expect(page).toHaveURL(/\/admin|\/nurse-dashboard/, { timeout: 10000 });
  });

  test('debería validar campos requeridos', async ({ page }) => {
    await page.click('button[type="submit"]');

    // Verificar que los campos muestran error de validación
    const usernameInput = page.locator('input[type="text"]');
    const passwordInput = page.locator('input[type="password"]');

    // Angular muestra validación HTML5
    await expect(usernameInput).toHaveAttribute('required');
    await expect(passwordInput).toHaveAttribute('required');
  });
});
