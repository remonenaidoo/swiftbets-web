import { expect, type Page } from '@playwright/test';

export const uniqueEmail = (label: string) => `${label}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@example.com`;

/** What the fake gateway last "emailed" to this address, like reading Mailpit. */
export async function lastEmail(page: Page, to: string): Promise<{ kind: string; token: string }> {
  const response = await page.request.get(`http://127.0.0.1:4011/__emails?to=${encodeURIComponent(to)}`);
  const email = (await response.json()) as { kind: string; token: string } | null;
  expect(email, `no email sent to ${to}`).not.toBeNull();
  return email!;
}

export async function register(page: Page, email: string, password = 'correct horse battery') {
  await page.goto('/account/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/^Password/).fill(password);
  await page.getByLabel(/^Date of birth/).fill('1990-04-23');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Open account' }).click();
  await expect(page.getByRole('heading', { name: 'Check your email' })).toBeVisible();
}

export async function signIn(page: Page, email: string, password = 'correct horse battery') {
  await page.goto('/account/sign-in');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

/** Fails the test on any Content-Security-Policy violation the browser reports. */
export function watchCsp(page: Page): string[] {
  const violations: string[] = [];
  page.on('console', (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
  return violations;
}
