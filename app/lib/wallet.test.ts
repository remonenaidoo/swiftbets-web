import { describe, expect, it } from 'vitest';
import { entryLabel, isOpen, paymentErrorMessage, statusLabel, withdrawalMessage } from './wallet';

describe('wallet helpers', () => {
  it('names payment statuses in plain words', () => {
    expect(statusLabel('awaitingApproval')).toBe('Being reviewed');
    expect(statusLabel('succeeded')).toBe('Received');
    expect(statusLabel('somethingNew')).toBe('somethingNew');
  });

  it('knows which payments are still moving', () => {
    expect(isOpen('pending')).toBe(true);
    expect(isOpen('submitted')).toBe(true);
    expect(isOpen('paid')).toBe(false);
    expect(isOpen('rejected')).toBe(false);
  });

  it('names statement entries', () => {
    expect(entryLabel('deposit')).toBe('Deposit');
    expect(entryLabel('withdrawalReturned')).toBe('Withdrawal returned');
    expect(entryLabel('mystery')).toBe('mystery');
  });

  it('tells the customer what happens to a withdrawal', () => {
    expect(withdrawalMessage({ withdrawalId: 'w', status: 'awaitingApproval', requiresApproval: true })).toMatch(/review/);
    expect(withdrawalMessage({ withdrawalId: 'w', status: 'paid', requiresApproval: false })).toMatch(/paid/);
    expect(withdrawalMessage({ withdrawalId: 'w', status: 'submitted', requiresApproval: false })).toMatch(/on its way/);
  });

  it('never echoes an unknown server message', () => {
    expect(paymentErrorMessage('kyc_required')).toMatch(/Verify your identity/);
    expect(paymentErrorMessage(undefined)).toBe('Something went wrong. Try again.');
    expect(paymentErrorMessage('boom')).toBe('Something went wrong. Try again.');
  });
});
