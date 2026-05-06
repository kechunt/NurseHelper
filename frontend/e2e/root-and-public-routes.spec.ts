import { test, expect } from '@playwright/test';

test.describe('Rutas públicas y redirección inicial', () => {
  test('sin sesión la raíz / redirige a login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
  });

  test('/login muestra el formulario de acceso', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Iniciar Sesión' })).toBeVisible();
  });

  test('/register es accesible sin sesión', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/register$/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Crear Cuenta' })).toBeVisible();
  });

  test('/verify-email sin query email redirige a login', async ({ page }) => {
    await page.goto('/verify-email');
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
  });

  test('desde login el enlace lleva a registro', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Regístrate aquí/i }).click();
    await expect(page).toHaveURL(/\/register$/, { timeout: 10000 });
  });

  test('desde registro el enlace lleva a login', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('link', { name: /Inicia sesión aquí/i }).click();
    await expect(page).toHaveURL(/\/login$/, { timeout: 10000 });
  });
});
