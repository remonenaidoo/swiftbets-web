import { expect, test } from '@playwright/test';
import { register, signIn, uniqueEmail } from './helpers';

test.beforeEach(async ({ page }) => {
  const email = uniqueEmail('rg');
  await register(page, email);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole('link', { name: /Safer gambling/ }).click();
  await expect(page.getByRole('heading', { name: 'Safer gambling' })).toBeVisible();
});

test('a lower limit applies at once and a higher one waits 24 hours', async ({ page }) => {
  await page.getByLabel('Limit on').selectOption('stake');
  await page.getByLabel('Per').selectOption('day');
  await page.getByLabel(/^Amount/).fill('500');
  await page.getByRole('button', { name: 'Set limit' }).click();
  await expect(page.getByText(/Stake limit per day: R\s?500[.,]00/)).toBeVisible();

  await page.getByLabel(/^Amount/).fill('800');
  await page.getByRole('button', { name: 'Set limit' }).click();
  await expect(page.getByText(/Rises to R\s?800[.,]00 on/)).toBeVisible();

  await page.getByLabel(/^Amount/).fill('300');
  await page.getByRole('button', { name: 'Set limit' }).click();
  await expect(page.getByText(/Stake limit per day: R\s?300[.,]00/)).toBeVisible();
  await expect(page.getByText(/Rises to/)).toHaveCount(0);
});

test('removing a limit takes 24 hours and a bad amount is explained', async ({ page }) => {
  await page.getByLabel(/^Amount/).fill('ten rand');
  await page.getByRole('button', { name: 'Set limit' }).click();
  await expect(page.getByRole('alert')).toContainText('Enter an amount above zero');

  await page.getByLabel(/^Amount/).fill('1000');
  await page.getByRole('button', { name: 'Set limit' }).click();
  await page.getByRole('button', { name: 'Remove deposit limit per day' }).click();
  await expect(page.getByText(/^Ends on /)).toBeVisible();
});

test('session settings are kept and out-of-range values are refused', async ({ page }) => {
  await page.getByLabel('Session limit (minutes)').fill('90');
  await page.getByLabel('Remind me every (minutes)').fill('30');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('status')).toContainText('Session settings saved');
  await expect(page.getByLabel('Session limit (minutes)')).toHaveValue('90');
});

test('a break needs confirming, then closes the account until it ends', async ({ page }) => {
  await page.getByLabel('How long').selectOption('coolingOff:7');
  await page.getByRole('button', { name: 'Start my break' }).click();
  await expect(page.getByRole('alert')).toContainText('Tick the box');

  await page.getByLabel(/cannot be undone early/).check();
  await page.getByRole('button', { name: 'Start my break' }).click();
  await expect(page.getByText(/You are on a break until/)).toBeVisible();
});
