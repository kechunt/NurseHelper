import { test, expect, type Page } from '@playwright/test';

async function installAdminDashboardApiMocks(page: Page): Promise<void> {
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
        token: 'e2e-playwright-admin-token',
        user: {
          id: 1,
          username: 'admin_e2e',
          email: 'admin_e2e@test.local',
          firstName: 'Admin',
          lastName: 'E2E',
          role: 'admin',
          emailVerified: true,
        },
      }),
    });
  });

  await page.route('**/api/admin/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/api/users**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ users: [], total: 0 }),
    });
  });

  await page.route('**/api/patients**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ patients: [], total: 0 }),
    });
  });
}

test.describe('Admin dashboard (API simulada)', () => {
  test('login admin + shell del panel admin', async ({ page }) => {
    await installAdminDashboardApiMocks(page);

    await page.goto('/login');
    await page.fill('#usernameOrEmail', 'admin_e2e');
    await page.fill('#password', 'cualquiera');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/admin/, { timeout: 15000 });
    await expect(page.locator('#dashboard-shell-header')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('#dashboard-shell-logout-btn')).toBeVisible();
  });
});
