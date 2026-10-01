import { expect, test } from '@playwright/test';

test('every page is served with a per-request nonce CSP and only nonced scripts', async ({ page, request }) => {
  const first = await request.get('/account/sign-in');
  const second = await request.get('/account/sign-in');
  const policy = first.headers()['content-security-policy'] ?? '';
  const nonce = /'nonce-([^']+)'/.exec(policy)?.[1];

  expect(policy).toContain("script-src 'nonce-");
  expect(policy).toContain("'strict-dynamic'");
  expect(policy).toContain("style-src 'self'");
  expect(policy).not.toContain('unsafe-inline');
  expect(nonce).toBeTruthy();
  expect(second.headers()['content-security-policy']).not.toContain(nonce!);

  await page.goto('/account/sign-in');
  const scripts = await page.locator('script').evaluateAll((nodes) => nodes.map((n) => (n as HTMLScriptElement).nonce));
  expect(scripts.length).toBeGreaterThan(0);
  expect(scripts.every((value) => value.length > 0)).toBe(true);
});

test('the account page needs a session', async ({ page }) => {
  await page.goto('/account');
  await expect(page).toHaveURL(/\/account\/sign-in$/);
});
