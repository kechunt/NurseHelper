import { test, expect, type Page } from '@playwright/test';

async function installPharmacyDashboardApiMocks(page: Page): Promise<void> {
  await page.route('**/api/auth/login', async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        message: 'OK',
        token: 'e2e-playwright-pharmacy-token',
        user: {
          id: 99,
          username: 'pharmacy_e2e',
          email: 'pharmacy_e2e@test.local',
          firstName: 'Farmacia',
          lastName: 'E2E',
          role: 'pharmacy',
          emailVerified: true,
        },
      }),
    });
  });

  await page.route('**/api/pharmacy/requests**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/api/pharmacy/deliveries**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });

  await page.route('**/api/pharmacy/inventory**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
  });
}

test.describe('Pharmacy dashboard (API simulada)', () => {
  test('login farmacia + pestaña solicitudes visible', async ({ page }) => {
    await installPharmacyDashboardApiMocks(page);

    await page.goto('/login');
    await page.fill('#usernameOrEmail', 'pharmacy_e2e');
    await page.fill('#password', 'cualquiera');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/pharmacy/, { timeout: 15000 });
    await expect(page.locator('#pharmacy-tab-requests')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#pharmacy-tab-history')).toBeVisible();
    await expect(page.locator('#pharmacy-tab-inventory')).toBeVisible();
    await expect(page.locator('#dashboard-shell-logout-btn')).toBeVisible();
  });
});
