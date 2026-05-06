import { test, expect, type Page } from '@playwright/test';

/**
 * Flujo enfermería sin BD: interceptamos `/api/auth/login` y `/api/nurse/*` necesarios
 * para el primer render del dashboard (forkJoin inicial + `loadSecondaryData`).
 */
async function installNurseDashboardApiMocks(page: Page): Promise<void> {
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
        token: 'e2e-playwright-nurse-token',
        user: {
          id: 4242,
          username: 'nurse_e2e',
          email: 'nurse_e2e@test.local',
          firstName: 'Enfermería',
          lastName: 'E2E',
          role: 'nurse',
          emailVerified: true,
        },
      }),
    });
  });

  await page.route('**/api/nurse/stats', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        assignedPatientsCount: 0,
        maxPatients: 8,
        pendingTasksCount: 0,
        medicationsToday: 0,
        assignedArea: 'Área simulada',
        assignedAreaId: 1,
      }),
    });
  });

  await page.route('**/api/nurse/beds', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route(
    (url) => url.pathname === '/api/nurse/patients',
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '[]',
      });
    }
  );

  await page.route('**/api/nurse/tasks/today', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/api/nurse/medications/pharmacy', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

  await page.route('**/api/nurse/shift-context', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hasActiveShiftWindow: false,
        shiftName: null,
        shiftTime: null,
        attendanceStatus: null,
        onDuty: false,
        summary: '',
      }),
    });
  });
}

test.describe('Nurse dashboard (API simulada)', () => {
  test('login enfermería + dashboard muestra el shell sin backend real', async ({ page }) => {
    await installNurseDashboardApiMocks(page);

    await page.goto('/login');
    await page.fill('#usernameOrEmail', 'nurse_e2e');
    await page.fill('#password', 'cualquiera');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/nurse-dashboard/, { timeout: 15000 });
    await expect(page.getByText('Panel de Enfermera', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Área simulada').first()).toBeVisible();
  });
});
