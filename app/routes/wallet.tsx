import { Form, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/wallet';
import { Card, Field, Notice, Submit } from '../components/Form';
import { currentSession, gateway } from '../lib/gateway.server';
import { formatMoney, toMinor, when } from '../lib/safer-gambling';
import {
  entryLabel,
  isOpen,
  paymentErrorMessage,
  statusLabel,
  withdrawalMessage,
  type DepositView,
  type PaymentItem,
  type Statement,
  type WalletAccount,
  type WithdrawalView,
} from '../lib/wallet';

export const meta: Route.MetaFunction = () => [{ title: 'Wallet · SwiftBets' }];

export async function loader({ request, context }: Route.LoaderArgs) {
  if (!(await currentSession(context, request))) throw redirect('/account/sign-in');
  const wanted = new URL(request.url).searchParams.get('currency');
  const [accounts, payments, profile] = await Promise.all([
    gateway<WalletAccount[]>(context, request, '/me/wallet/accounts'),
    gateway<PaymentItem[]>(context, request, '/me/payments'),
    gateway<{ currency: string }>(context, request, '/profile'),
  ]);
  const list = accounts.data ?? [];
  const currency = list.find((a) => a.currency === wanted)?.currency ?? list[0]?.currency ?? profile.data?.currency ?? 'ZAR';
  const statement = list.length ? await gateway<Statement>(context, request, `/me/wallet/statement?currency=${encodeURIComponent(currency)}&limit=20`) : null;
  return { accounts: list, currency, payments: payments.data ?? [], statement: statement?.data ?? null };
}

type Outcome = { ok: boolean; message: string };

export async function action({ request, context }: Route.ActionArgs): Promise<Outcome> {
  const form = await request.formData();
  const intent = String(form.get('intent') ?? '');
  const currency = String(form.get('currency') ?? 'ZAR');
  const amount = toMinor(String(form.get('amount') ?? ''));
  if (amount === null) return { ok: false, message: 'Enter an amount above zero, like 500 or 250.50.' };

  if (intent === 'deposit') {
    const response = await gateway<DepositView>(context, request, '/me/deposits', { method: 'POST', body: { amount, currency } });
    if (!response.ok) return { ok: false, message: paymentErrorMessage(response.error?.code) };
    if (response.data?.checkoutUrl) throw redirect(response.data.checkoutUrl);
    return { ok: true, message: 'Your deposit has started. It shows below once your bank confirms it.' };
  }
  if (intent === 'withdraw') {
    const response = await gateway<WithdrawalView>(context, request, '/me/withdrawals', { method: 'POST', body: { amount, currency } });
    return response.ok && response.data ? { ok: true, message: withdrawalMessage(response.data) } : { ok: false, message: paymentErrorMessage(response.error?.code) };
  }
  return { ok: false, message: 'Something went wrong. Try again.' };
}

export default function Wallet({ loaderData, actionData }: Route.ComponentProps) {
  const { accounts, currency, payments, statement } = loaderData;
  const busy = useNavigation().state === 'submitting';
  return (
    <div className="flex flex-col gap-lg">
      <Card title="Wallet">
        {actionData ? <Notice tone={actionData.ok ? 'success' : 'error'}>{actionData.message}</Notice> : null}
        {accounts.length === 0 ? <p className="text-text-muted">Your wallet opens with your first deposit.</p> : null}
        <ul className="grid gap-md sm:grid-cols-2">
          {accounts.map((a) => (
            <li key={a.accountId} className="rounded-md border border-border p-md">
              <p className="text-sm text-text-muted">{`Available (${a.currency})`}</p>
              <p className="text-2xl font-semibold" data-testid={`available-${a.currency}`}>{formatMoney(a.available, a.currency)}</p>
              {a.reserved > 0 ? <p className="text-sm text-text-muted">{`${formatMoney(a.reserved, a.currency)} in open bets and withdrawals`}</p> : null}
              {a.bonus > 0 ? <p className="text-sm text-text-muted">{`${formatMoney(a.bonus, a.currency)} bonus`}</p> : null}
            </li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-lg sm:grid-cols-2">
        <MoneyForm title="Deposit" intent="deposit" currency={currency} busy={busy} button="Deposit" note="You will be taken to our payment provider to pay." />
        <MoneyForm title="Withdraw" intent="withdraw" currency={currency} busy={busy} button="Withdraw" note="Paid to your verified bank account. Larger amounts are reviewed first." />
      </div>

      <section aria-labelledby="payments-title" className="rounded-lg border border-border bg-surface-raised p-lg">
        <h2 id="payments-title" className="mb-md text-xl font-semibold">Deposits and withdrawals</h2>
        {payments.length === 0 ? (
          <p className="text-text-muted">No payments yet.</p>
        ) : (
          <ul className="flex flex-col gap-sm">
            {payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-sm rounded-md border border-border px-sm py-xs">
                <span>{`${p.kind === 'deposit' ? 'Deposit' : 'Withdrawal'} of ${formatMoney(p.amount, p.currency)}`}</span>
                <span className={isOpen(p.status) ? 'font-medium text-accent' : 'text-text-muted'}>{statusLabel(p.status)}</span>
                <span className="w-full text-sm text-text-muted">{when(p.createdAt)}{p.reason ? ` · ${p.reason}` : ''}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {statement ? (
        <section aria-labelledby="statement-title" className="rounded-lg border border-border bg-surface-raised p-lg">
          <h2 id="statement-title" className="mb-md text-xl font-semibold">{`Statement (${statement.account.currency})`}</h2>
          {statement.lines.length === 0 ? (
            <p className="text-text-muted">Nothing has moved yet.</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-text-muted">
                  <th scope="col" className="py-xs">When</th>
                  <th scope="col">What</th>
                  <th scope="col" className="text-right">Amount</th>
                  <th scope="col" className="text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {statement.lines.map((l) => (
                  <tr key={l.sequence} className="border-t border-border">
                    <td className="py-xs">{when(l.postedAt)}</td>
                    <td>{entryLabel(l.kind)}</td>
                    <td className="text-right">{formatMoney(l.amount, statement.account.currency)}</td>
                    <td className="text-right">{formatMoney(l.availableAfter, statement.account.currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      ) : null}
    </div>
  );
}

function MoneyForm({ title, intent, currency, busy, button, note }: { title: string; intent: string; currency: string; busy: boolean; button: string; note: string }) {
  const id = `${intent}-title`;
  return (
    <section aria-labelledby={id} className="rounded-lg border border-border bg-surface-raised p-lg">
      <h2 id={id} className="mb-sm text-xl font-semibold">{title}</h2>
      <p className="mb-md text-sm text-text-muted">{note}</p>
      <Form method="post" className="flex flex-col gap-md">
        <input type="hidden" name="intent" value={intent} />
        <input type="hidden" name="currency" value={currency} />
        <Field label={`${title} amount (${currency})`} name="amount" inputMode="decimal" required />
        <Submit busy={busy}>{button}</Submit>
      </Form>
    </section>
  );
}
