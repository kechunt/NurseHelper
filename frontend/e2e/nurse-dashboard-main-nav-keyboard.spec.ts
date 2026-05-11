import { test, expect, type Page } from '@playwright/test';

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

  await page.route((url) => url.pathname === '/api/nurse/patients', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '[]',
    });
  });

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

test.describe('Nurse dashboard main nav keyboard (a11y)', () => {
  test('ArrowRight/ArrowLeft cambian de vista y mueven el foco', async ({ page }) => {
    await installNurseDashboardApiMocks(page);

    await page.goto('/login');
    await page.fill('#usernameOrEmail', 'nurse_e2e');
    await page.fill('#password', 'cualquiera');
    await page.click('button[type="submit"]');

    const tablist = page.locator('[role="tablist"][aria-label="Vistas del panel de enfermería"]');
    await expect(tablist).toBeVisible({ timeout: 15000 });

    const summaryPanel = page.locator('#nurse-panel-summary');
    const tasksPanel = page.locator('#nurse-panel-tasks');

    // La vista inicial es "summary" (según orden de negocio del panel).
    await expect(summaryPanel).toBeVisible({ timeout: 15000 });
    await expect(tasksPanel).toBeHidden();

    // Enfocar la pestaña actual y navegar con flechas.
    await page.locator('#nurse-tab-summary').focus();
    await page.keyboard.press('ArrowRight');

    await expect(tasksPanel).toBeVisible({ timeout: 5000 });
    await expect(summaryPanel).toBeHidden();

    const activeIdAfterRight = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id);
    expect(activeIdAfterRight).toBe('nurse-tab-tasks');

    // Volver con ArrowLeft.
    await page.keyboard.press('ArrowLeft');
    await expect(summaryPanel).toBeVisible({ timeout: 5000 });

    const activeIdAfterLeft = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.id);
    expect(activeIdAfterLeft).toBe('nurse-tab-summary');
  });
});

