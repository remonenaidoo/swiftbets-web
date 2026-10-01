import { AxeBuilder } from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { register, signIn, uniqueEmail } from './helpers';

const publicPages = ['/', '/account/sign-in', '/account/register', '/account/forgot-password', '/account/reset-password?token=t', '/account/verify'];

async function seriousViolations(page: import('@playwright/test').Page) {
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  return results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical').map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

for (const path of publicPages) {
  test(`${path} has no serious accessibility violations`, async ({ page }) => {
    await page.goto(path);
    expect(await seriousViolations(page)).toEqual([]);
  });
}

test('the safer gambling page has no serious accessibility violations', async ({ page }) => {
  const email = uniqueEmail('a11y-rg');
  await register(page, email);
  await signIn(page, email);
  await page.goto('/account/safer-gambling');
  expect(await seriousViolations(page)).toEqual([]);
});

test('the account page has no serious accessibility violations', async ({ page }) => {
  const email = uniqueEmail('a11y');
  await register(page, email);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  expect(await seriousViolations(page)).toEqual([]);
});
