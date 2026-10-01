import { describe, expect, it } from 'vitest';
import { complianceErrorMessage, formatMoney, pendingNote, toMinor, type Limit } from './safer-gambling';

const limit: Limit = { kind: 'stake', period: 'day', amount: 50_000, currency: 'ZAR', pendingAmount: null, pendingEffectiveAt: null, pendingRemoval: false };

describe('safer gambling helpers', () => {
  it('reads rands and cents as minor units', () => {
    expect(toMinor('500')).toBe(50_000);
    expect(toMinor('12.5')).toBe(1_250);
    expect(toMinor('12,05')).toBe(1_205);
    expect(toMinor(' 0 ')).toBeNull();
    expect(toMinor('1.234')).toBeNull();
    expect(toMinor('-5')).toBeNull();
    expect(toMinor('ten')).toBeNull();
  });

  it('formats minor units as money', () => {
    expect(formatMoney(50_000, 'ZAR')).toMatch(/R\s?500[.,]00/);
  });

  it('says what is pending on a limit', () => {
    expect(pendingNote(limit)).toBeNull();
    expect(pendingNote({ ...limit, pendingAmount: 80_000, pendingEffectiveAt: '2026-10-02T12:00:00Z' })).toMatch(/^Rises to R\s?800[.,]00 on /);
    expect(pendingNote({ ...limit, pendingRemoval: true, pendingEffectiveAt: '2026-10-02T12:00:00Z' })).toMatch(/^Ends on /);
  });

  it('never echoes an unknown server message', () => {
    expect(complianceErrorMessage('already_excluded')).toMatch(/already excluded/);
    expect(complianceErrorMessage('boom')).toBe('Something went wrong. Try again.');
  });
});
