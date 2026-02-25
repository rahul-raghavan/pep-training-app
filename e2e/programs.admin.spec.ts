import { test, expect } from '@playwright/test';

test.describe('Programs (super_admin)', () => {
  test('can access the programs page', async ({ page }) => {
    await page.goto('/admin/programs');
    await expect(page).not.toHaveURL(/\/login/);
    // Page is client-rendered — wait for the heading to appear
    await expect(page.locator('h1')).toContainText('Training Programs', { timeout: 10000 });
  });

  test('can see the New Program button', async ({ page }) => {
    await page.goto('/admin/programs');
    await expect(page.getByRole('button', { name: 'New Program' })).toBeVisible();
  });

  test('can access the admin dashboard', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page).not.toHaveURL(/\/login/);
  });
});
