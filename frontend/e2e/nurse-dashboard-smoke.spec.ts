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
      body: JSON.stringify({ medications: [], pharmacyContactsByShift: [] }),
    });
  });

  await page.route('**/api/nurse/shift-context', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        hasActiveShiftWindow: true,
        shiftName: 'Mañana',
        shiftTime: '07:00-15:00',
        attendanceStatus: 'present',
        onDuty: true,
        canCheckIn: false,
        pendingAreaAssignment: false,
        summary: 'En turno',
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
    await expect(page.locator('#app-router-slot')).toBeAttached();
    await expect(page.locator('#confirmation-wrapper-host')).toBeAttached();
    await expect(page.getByText('Panel de Enfermera', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Área simulada').first()).toBeVisible();

    await expect(page.locator('#nurse-dashboard-shell-header-actions')).toBeVisible();
    await expect(page.locator('#nurse-dashboard-header-search-input')).toBeVisible();
    await expect(page.locator('#nurse-dashboard-main-nav-handover-quick-btn')).toBeVisible();
    await expect(page.locator('#nurse-dashboard-main-nav-reports-quick-btn')).toBeVisible();
    await expect(page.locator('#in-app-notifications-bell-nurse-toggle')).toBeVisible();
    await expect(page.locator('#dashboard-shell-logo-section')).toBeVisible();
    await expect(page.locator('#dashboard-shell-profile-trigger-btn')).toBeVisible();
    await expect(page.locator('#dashboard-shell-logout-btn')).toBeVisible();

    await expect(page.locator('#dashboard-shell-nav-mobile-overlay')).toBeAttached();
    await expect(page.locator('#dashboard-shell-nav-mobile-close-btn')).toBeAttached();
    await expect(page.locator('#dashboard-shell-nav-hamburger-btn')).toBeAttached();

    await expect(page.locator('#dashboard-shell-nav')).toBeAttached();

    await expect(page.locator('#dashboard-shell-main-wrapper')).toBeAttached();

    await expect(page.locator('#dashboard-shell-main-slot')).toBeAttached();

    await expect(page.locator('#dashboard-shell-overlays-slot')).toBeAttached();

    await expect(page.locator('#toast-container')).toBeAttached();

    await expect(page.locator('#dashboard-shell-header')).toBeAttached();
    await expect(page.locator('#dashboard-shell-body')).toBeAttached();
  });
});
