import { expect, test } from '@playwright/test';
import { register, signIn, uniqueEmail } from './helpers';

let email: string;

test.beforeEach(async ({ page }) => {
  email = uniqueEmail('wallet');
  await register(page, email);
  await signIn(page, email);
  await expect(page).toHaveURL(/\/account$/);
  await page.getByRole('link', { name: /^Wallet/ }).click();
  await expect(page.getByRole('heading', { name: 'Wallet', exact: true })).toBeVisible();
});

async function deposit(page: import('@playwright/test').Page, amount: string) {
  await page.getByLabel(/^Deposit amount/).fill(amount);
  await page.getByRole('button', { name: 'Deposit', exact: true }).click();
  await expect(page).toHaveURL(/\/account\/wallet$/);
}

test('a deposit goes through checkout and lands in the balance and statement', async ({ page }) => {
  await expect(page.getByText('Your wallet opens with your first deposit.')).toBeVisible();
  await deposit(page, '250');

  await expect(page.getByTestId('available-ZAR')).toHaveText(/R\s?250[.,]00/);
  await expect(page.getByText(/Deposit of R\s?250[.,]00/)).toBeVisible();
  await expect(page.getByText('Received')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Deposit' })).toBeVisible();
});

test('a withdrawal needs a verified identity and large ones are reviewed', async ({ page }) => {
  await deposit(page, '10000');

  await page.getByLabel(/^Withdraw amount/).fill('100');
  await page.getByRole('button', { name: 'Withdraw', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Verify your identity before you withdraw.');

  await page.request.post(`http://127.0.0.1:4011/__verify-identity?of=${encodeURIComponent(email)}`, { headers: { 'X-SwiftBets-Csrf': '1' } });
  await page.getByLabel(/^Withdraw amount/).fill('100');
  await page.getByRole('button', { name: 'Withdraw', exact: true }).click();
  await expect(page.getByText('Your withdrawal has been paid.')).toBeVisible();

  await page.getByLabel(/^Withdraw amount/).fill('6000');
  await page.getByRole('button', { name: 'Withdraw', exact: true }).click();
  await expect(page.getByText(/held for a quick review/)).toBeVisible();
  await expect(page.getByText('Being reviewed')).toBeVisible();
  await expect(page.getByTestId('available-ZAR')).toHaveText(/R\s?3[\s,]?900[.,]00/);
});

test('an amount that is not money is explained', async ({ page }) => {
  await page.getByLabel(/^Deposit amount/).fill('lots');
  await page.getByRole('button', { name: 'Deposit', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Enter an amount above zero');
});
