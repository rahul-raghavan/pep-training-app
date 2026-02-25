import { test, expect } from '@playwright/test';

test.describe('Learner view (user)', () => {
  test('can access the learn page', async ({ page }) => {
    await page.goto('/learn');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('My Training');
  });

  test('sees welcome message with name', async ({ page }) => {
    await page.goto('/learn');
    await expect(page.getByText('Welcome,')).toBeVisible();
  });

  test('cannot access admin pages', async ({ page }) => {
    await page.goto('/admin/dashboard');
    // useAuth('admin') checks role client-side and redirects via JS — wait for it
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});
