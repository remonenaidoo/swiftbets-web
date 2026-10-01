import { expect, test } from '@playwright/test';
import { lastEmail, register, signIn, uniqueEmail, watchCsp } from './helpers';

test('a visitor registers, confirms the emailed link, signs in and revokes a second device', async ({ page, browser }) => {
  const csp = watchCsp(page);
  const email = uniqueEmail('gate');
  await register(page, email);

  const verify = await lastEmail(page, email);
  await page.goto(`/account/verify?token=${verify.token}`);
  await expect(page.getByText('Your email address is confirmed.')).toBeVisible();

  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(1);

  const other = await browser.newContext({ userAgent: 'Second Phone' });
  const phone = await other.newPage();
  await signIn(phone, email);
  await expect(phone).toHaveURL(/\/account$/);

  await page.reload();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Sign out Second Phone' }).click();
  await expect(page.getByText('That device is signed out.')).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(1);

  await phone.goto('/account');
  await expect(phone).toHaveURL(/\/account\/sign-in$/);
  await other.close();
  expect(csp).toEqual([]);
});

test('an underage visitor is refused before anything is sent', async ({ page }) => {
  const email = uniqueEmail('young');
  const seventeen = new Date();
  seventeen.setFullYear(seventeen.getFullYear() - 17);
  await page.goto('/account/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel(/^Password/).fill('correct horse battery');
  await page.getByLabel(/^Date of birth/).fill(seventeen.toISOString().slice(0, 10));
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Open account' }).click();

  await expect(page.getByText('You must be 18 or older to open an account.')).toBeVisible();
  const sent = await page.request.get(`http://127.0.0.1:4011/__emails?to=${encodeURIComponent(email)}`);
  expect(await sent.json()).toBeNull();
});

test('a wrong password is refused and a reset link sets a new one', async ({ page }) => {
  const email = uniqueEmail('reset');
  await register(page, email);
  await signIn(page, email, 'not the password');
  await expect(page.getByText('Email or password is incorrect.')).toBeVisible();

  await page.goto('/account/forgot-password');
  await page.getByLabel('Email').fill(email);
  await page.getByRole('button', { name: 'Send reset link' }).click();
  await expect(page.getByText(`If ${email} has an account, a reset link is on its way.`, { exact: false })).toBeVisible();

  const reset = await lastEmail(page, email);
  await page.goto(`/account/reset-password?token=${reset.token}`);
  await page.getByLabel(/^New password/).fill('a brand new passphrase');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByRole('heading', { name: 'Password changed' })).toBeVisible();

  await signIn(page, email, 'a brand new passphrase');
  await expect(page).toHaveURL(/\/account$/);
});

test('signing out ends the session', async ({ page }) => {
  const email = uniqueEmail('signout');
  await register(page, email);
  await signIn(page, email);
  await page.getByRole('button', { name: 'Sign out', exact: true }).first().click();
  await expect(page).toHaveURL(/\/$/);
  await page.goto('/account');
  await expect(page).toHaveURL(/\/account\/sign-in$/);
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('registration and sign-in still work as plain forms', async ({ page }) => {
    const email = uniqueEmail('nojs');
    await register(page, email);
    await signIn(page, email);
    await expect(page).toHaveURL(/\/account$/);
  });
});
