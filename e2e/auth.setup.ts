import { test as setup } from '@playwright/test';

// Auth setup needs more time — Supabase calls + browser launch
setup.use({ actionTimeout: 60000 });

const DEV_LOGIN_URL = 'http://localhost:3000/api/auth/dev-login';

async function loginAndSaveState(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: any,
  user: { email: string; name: string; role: string },
  storageStatePath: string
) {
  // Step 1: Hit the dev-login endpoint (this sets cookies on the response)
  const loginResponse = await request.post(DEV_LOGIN_URL, { data: user });

  if (!loginResponse.ok()) {
    const body = await loginResponse.text();
    throw new Error(`Dev login failed for ${user.email}: ${loginResponse.status()} ${body}`);
  }

  // Step 2: Save cookies from the request context
  const requestState = await request.storageState();

  // Step 3: Create a temporary browser context, inject the cookies, and save its state
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addCookies(
    requestState.cookies.map((c: { sameSite: string; [key: string]: unknown }) => ({
      ...c,
      sameSite: c.sameSite as 'Lax' | 'Strict' | 'None',
    }))
  );
  await context.storageState({ path: storageStatePath });
  await context.close();
  await browser.close();
}

setup('authenticate as super_admin', async ({ request }) => {
  await loginAndSaveState(
    request,
    {
      email: 'test-admin@pepschoolv2.com',
      name: 'Test Admin',
      role: 'super_admin',
    },
    'e2e/auth/storageState.admin.json'
  );
});

setup('authenticate as user', async ({ request }) => {
  await loginAndSaveState(
    request,
    {
      email: 'test-user@pepschoolv2.com',
      name: 'Test User',
      role: 'user',
    },
    'e2e/auth/storageState.user.json'
  );
});
