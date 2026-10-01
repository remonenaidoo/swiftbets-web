import { Form, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/safer-gambling';
import { Card, Field, Notice, Submit } from '../components/Form';
import { currentSession, gateway } from '../lib/gateway.server';
import {
  complianceErrorMessage,
  coolingOffDays,
  formatMoney,
  kindOption,
  limitKinds,
  limitLabel,
  limitPeriods,
  pendingNote,
  selfExclusionMonths,
  toMinor,
  when,
  type ComplianceView,
} from '../lib/safer-gambling';

export const meta: Route.MetaFunction = () => [{ title: 'Safer gambling · SwiftBets' }];

export async function loader({ request, context }: Route.LoaderArgs) {
  if (!(await currentSession(context, request))) throw redirect('/account/sign-in');
  const [compliance, profile] = await Promise.all([
    gateway<ComplianceView>(context, request, '/me/compliance'),
    gateway<{ currency: string }>(context, request, '/profile'),
  ]);
  return { compliance: compliance.data ?? null, currency: profile.data?.currency ?? 'ZAR' };
}

type Outcome = { ok: true; message: string } | { ok: false; message: string };

export async function action({ request, context }: Route.ActionArgs): Promise<Outcome> {
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? '');
  const intent = field('intent');
  const currency = field('currency') || 'ZAR';
  const answer = (response: { ok: boolean; error?: { code?: string } }, message: string): Outcome =>
    response.ok ? { ok: true, message } : { ok: false, message: complianceErrorMessage(response.error?.code) };

  switch (intent) {
    case 'set-limit': {
      const amount = toMinor(field('amount'));
      if (amount === null) return { ok: false, message: 'Enter an amount above zero, like 500 or 250.50.' };
      const path = `/me/limits/${encodeURIComponent(field('kind'))}/${encodeURIComponent(field('period'))}`;
      return answer(await gateway(context, request, path, { method: 'PUT', body: { amount, currency } }),
        'Saved. A lower limit applies now; a higher one applies after 24 hours.');
    }
    case 'remove-limit': {
      const path = `/me/limits/${encodeURIComponent(field('kind'))}/${encodeURIComponent(field('period'))}`;
      return answer(await gateway(context, request, path, { method: 'DELETE' }), 'The limit ends in 24 hours.');
    }
    case 'session': {
      const minutes = (name: string) => (field(name) ? Number(field(name)) : null);
      return answer(await gateway(context, request, '/me/session-settings', { method: 'PUT', body: { sessionLimitMinutes: minutes('sessionLimitMinutes'), realityCheckMinutes: minutes('realityCheckMinutes') } }),
        'Session settings saved.');
    }
    case 'break': {
      if (form.get('confirm') !== 'on') return { ok: false, message: 'Tick the box to confirm. A break cannot be undone early.' };
      const [kind, length] = field('length').split(':');
      const body = kind === 'selfExclusion' ? { kind, months: Number(length) } : { kind: 'coolingOff', days: Number(length) };
      return answer(await gateway(context, request, '/me/exclusions', { method: 'POST', body }),
        'Your break has started. You will be signed out and cannot bet or deposit until it ends.');
    }
    default:
      return { ok: false, message: 'Something went wrong. Try again.' };
  }
}

export default function SaferGambling({ loaderData, actionData }: Route.ComponentProps) {
  const { compliance, currency } = loaderData;
  const busy = useNavigation().state === 'submitting';
  const exclusion = compliance?.restrictions.find((r) => r.kind === 'selfExclusion' || r.kind === 'coolingOff');
  return (
    <div className="flex flex-col gap-lg">
      <Card title="Safer gambling">
        <p className="text-text-muted">Set limits on what you deposit, stake and lose, take a break, or control how long you play.</p>
        {actionData ? <Notice tone={actionData.ok ? 'success' : 'error'}>{actionData.message}</Notice> : null}
        {compliance?.excluded && exclusion ? (
          <Notice tone="info">{`You are on a break${exclusion.endsAt ? ` until ${when(exclusion.endsAt)}` : ''}. Betting and deposits are closed.`}</Notice>
        ) : null}
      </Card>

      <section aria-labelledby="limits-title" className="rounded-lg border border-border bg-surface-raised p-lg">
        <h2 id="limits-title" className="mb-md text-xl font-semibold">Your limits</h2>
        {compliance && compliance.limits.length > 0 ? (
          <ul className="flex flex-col gap-sm">
            {compliance.limits.map((limit) => (
              <li key={`${limit.kind}-${limit.period}`} className="flex items-center justify-between gap-md rounded-md border border-border px-sm py-xs">
                <div>
                  <p className="font-medium">{`${limitLabel(limit.kind, limit.period)}: ${formatMoney(limit.amount, limit.currency)}`}</p>
                  {pendingNote(limit) ? <p className="text-sm text-text-muted">{pendingNote(limit)}</p> : null}
                </div>
                {!limit.pendingRemoval ? (
                  <Form method="post">
                    <input type="hidden" name="intent" value="remove-limit" />
                    <input type="hidden" name="kind" value={limit.kind} />
                    <input type="hidden" name="period" value={limit.period} />
                    <button type="submit" className="rounded-md border border-border px-sm py-xs" aria-label={`Remove ${limitLabel(limit.kind, limit.period).toLowerCase()}`}>
                      Remove
                    </button>
                  </Form>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-muted">You have no limits set.</p>
        )}

        <Form method="post" className="mt-md grid gap-md sm:grid-cols-4 sm:items-end">
          <input type="hidden" name="intent" value="set-limit" />
          <input type="hidden" name="currency" value={currency} />
          <Select label="Limit on" name="kind" options={limitKinds.map((k) => [k, kindOption(k)])} />
          <Select label="Per" name="period" options={limitPeriods.map((p) => [p, p])} />
          <Field label={`Amount (${currency})`} name="amount" inputMode="decimal" required />
          <Submit busy={busy}>Set limit</Submit>
        </Form>
      </section>

      <section aria-labelledby="session-title" className="rounded-lg border border-border bg-surface-raised p-lg">
        <h2 id="session-title" className="mb-md text-xl font-semibold">Session time</h2>
        <Form method="post" className="grid gap-md sm:grid-cols-3 sm:items-end">
          <input type="hidden" name="intent" value="session" />
          <Field label="Session limit (minutes)" name="sessionLimitMinutes" type="number" min={15} max={1440} defaultValue={compliance?.sessionLimitMinutes ?? ''} />
          <Field label="Remind me every (minutes)" name="realityCheckMinutes" type="number" min={10} max={240} defaultValue={compliance?.realityCheckMinutes ?? ''} />
          <Submit busy={busy}>Save</Submit>
        </Form>
      </section>

      <section aria-labelledby="break-title" className="rounded-lg border border-border bg-surface-raised p-lg">
        <h2 id="break-title" className="mb-md text-xl font-semibold">Take a break</h2>
        <p className="mb-md text-text-muted">A break signs you out everywhere and closes betting and deposits until it ends. It cannot be shortened.</p>
        <Form method="post" className="flex flex-col gap-md">
          <input type="hidden" name="intent" value="break" />
          <Select
            label="How long"
            name="length"
            options={[
              ...coolingOffDays.map((d): [string, string] => [`coolingOff:${d}`, `Cooling-off: ${d} day${d === 1 ? '' : 's'}`]),
              ...selfExclusionMonths.map((m): [string, string] => [`selfExclusion:${m}`, `Self-exclusion: ${m} months`]),
            ]}
          />
          <label className="flex items-center gap-sm text-sm">
            <input type="checkbox" name="confirm" />
            I understand this cannot be undone early.
          </label>
          <div>
            <button type="submit" disabled={busy} className="rounded-md border-2 border-negative px-md py-sm font-semibold text-negative disabled:opacity-60">
              Start my break
            </button>
          </div>
        </Form>
      </section>
    </div>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: [string, string][] }) {
  return (
    <label className="flex flex-col gap-xs text-sm font-medium">
      {label}
      <select name={name} className="rounded-md border border-border bg-surface-sunken px-sm py-xs text-text">
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}
