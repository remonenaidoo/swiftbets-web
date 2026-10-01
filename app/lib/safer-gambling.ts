// Wording and money handling for the safer-gambling page; compliance stays the authority on every rule.

export const limitKinds = ['deposit', 'stake', 'loss'] as const;
export const limitPeriods = ['day', 'week', 'month'] as const;
export const coolingOffDays = [1, 7, 14, 30, 42] as const;
export const selfExclusionMonths = [6, 12, 24, 60] as const;

export type LimitKind = (typeof limitKinds)[number];
export type LimitPeriod = (typeof limitPeriods)[number];

export interface Limit {
  kind: LimitKind;
  period: LimitPeriod;
  amount: number;
  currency: string;
  pendingAmount: number | null;
  pendingEffectiveAt: string | null;
  pendingRemoval: boolean;
}

export interface Restriction {
  kind: string;
  startsAt: string;
  endsAt: string | null;
  reason: string;
}

export interface ComplianceView {
  limits: Limit[];
  restrictions: Restriction[];
  sessionLimitMinutes: number | null;
  realityCheckMinutes: number | null;
  excluded: boolean;
}

/** Rands and cents typed by a person, as minor units; null when it is not a positive amount with at most two decimals. */
export function toMinor(input: string): number | null {
  const match = /^\s*(\d{1,9})(?:[.,](\d{1,2}))?\s*$/.exec(input);
  if (!match) return null;
  const minor = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  return minor > 0 ? minor : null;
}

export function formatMoney(minor: number, currency: string): string {
  return new Intl.NumberFormat('en-ZA', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(minor / 100);
}

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

export const limitLabel = (kind: LimitKind, period: LimitPeriod) => `${capitalise(kind)} limit per ${period}`;

export const kindOption = (kind: LimitKind) => (kind === 'loss' ? 'Losses' : `${capitalise(kind)}s`);

export const when = (iso: string) => new Date(iso).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' });

/** What is changing on a limit and when, or null when nothing is pending. */
export function pendingNote(limit: Limit): string | null {
  if (!limit.pendingEffectiveAt) return null;
  return limit.pendingRemoval
    ? `Ends on ${when(limit.pendingEffectiveAt)}`
    : `Rises to ${formatMoney(limit.pendingAmount ?? 0, limit.currency)} on ${when(limit.pendingEffectiveAt)}`;
}

const known: Record<string, string> = {
  invalid_limit: 'Enter an amount above zero.',
  unsupported_currency: 'Limits are set in ZAR or USD.',
  currency_mismatch: 'This limit is held in another currency.',
  amount_required: 'Enter an amount.',
  limit_not_found: 'There is no such limit.',
  invalid_cooling_off: 'Choose a break of 1 to 42 days.',
  invalid_self_exclusion: 'Choose a self-exclusion of 6 to 60 months.',
  already_excluded: 'Your account is already excluded for at least that long.',
  invalid_session_limit: 'A session limit is 15 minutes to 24 hours.',
  invalid_reality_check: 'A reminder comes every 10 minutes to 4 hours.',
};

export const complianceErrorMessage = (code: string | undefined) => (code && known[code]) || 'Something went wrong. Try again.';
