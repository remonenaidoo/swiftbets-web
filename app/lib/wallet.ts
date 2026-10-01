// Shapes and wording for the customer wallet page: balances per currency, deposits, withdrawals and the statement.

export interface WalletAccount {
  accountId: string;
  currency: string;
  available: number;
  reserved: number;
  bonus: number;
}

export interface PaymentItem {
  kind: 'deposit' | 'withdrawal';
  id: string;
  amount: number;
  currency: string;
  status: string;
  reason: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface StatementLine {
  sequence: number;
  postingId: string;
  kind: string;
  amount: number;
  availableAfter: number;
  reference: string | null;
  postedAt: string;
}

export interface Statement {
  account: WalletAccount;
  lines: StatementLine[];
  next: number | null;
}

export interface DepositView {
  paymentId: string;
  status: string;
  checkoutUrl: string | null;
}

export interface WithdrawalView {
  withdrawalId: string;
  status: string;
  requiresApproval: boolean;
}

const statuses: Record<string, string> = {
  created: 'Started',
  pending: 'Waiting for your bank',
  succeeded: 'Received',
  failed: 'Failed',
  requested: 'Requested',
  awaitingApproval: 'Being reviewed',
  approved: 'Approved',
  submitted: 'On its way',
  paid: 'Paid',
  rejected: 'Declined',
};

export const statusLabel = (status: string) => statuses[status] ?? status;

/** Final payments get no badge; the rest are still moving. */
export const isOpen = (status: string) => !['succeeded', 'failed', 'paid', 'rejected'].includes(status);

const entries: Record<string, string> = {
  bet: 'Bet placed',
  betReturned: 'Bet returned',
  winnings: 'Winnings',
  correction: 'Correction',
  topUp: 'Top-up',
  deposit: 'Deposit',
  withdrawal: 'Withdrawal',
  withdrawalReturned: 'Withdrawal returned',
};

export const entryLabel = (kind: string) => entries[kind] ?? kind;

/** What the customer is told after asking for a withdrawal. */
export function withdrawalMessage(withdrawal: WithdrawalView): string {
  if (withdrawal.status === 'awaitingApproval') return 'Your withdrawal is held for a quick review. We will pay it once it is approved.';
  if (withdrawal.status === 'paid') return 'Your withdrawal has been paid.';
  return 'Your withdrawal is on its way to your bank.';
}

const known: Record<string, string> = {
  amount_out_of_range: 'That amount is outside what can be moved at once.',
  currency_not_supported: 'That currency is not supported.',
  kyc_required: 'Verify your identity before you withdraw.',
  insufficient_funds: 'You do not have enough available to withdraw that much.',
  withdrawals_blocked: 'Withdrawals are paused on your account. Contact support.',
  account_blocked: 'Your account is closed to payments. Contact support.',
  account_restricted: 'Deposits are closed on your account right now.',
  deposit_limit_exceeded: 'That deposit would take you over your deposit limit.',
  provider_unavailable: 'Our payment provider could not be reached. Try again shortly.',
};

export const paymentErrorMessage = (code: string | undefined) => (code && known[code]) || 'Something went wrong. Try again.';
