import { test, expect } from '@playwright/test';

test.describe('User Management (super_admin)', () => {
  test('can access the users page', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('h1')).toContainText('User Management');
  });

  test('can see the Create User button', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('button', { name: 'Create User' })).toBeVisible();
  });

  test('can open the Create User modal', async ({ page }) => {
    await page.goto('/admin/users');
    await page.getByRole('button', { name: 'Create User' }).click();
    await expect(page.getByText('Pre-register a user')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('can see the role filter buttons', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.getByRole('button', { name: 'All' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Super Admin' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Admin', exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'User', exact: true })).toBeVisible();
  });
});
