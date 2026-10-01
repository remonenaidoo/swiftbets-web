import { describe, expect, it } from 'vitest';
import { minutesPlayed, msUntilNextCheck, playedLabel } from './reality-check';

const start = new Date('2026-10-01T10:00:00Z');
const at = (minutes: number) => new Date(start.getTime() + minutes * 60_000);

describe('reality checks', () => {
  it('fall due at each whole interval from the session start', () => {
    expect(msUntilNextCheck(start, 30, at(0))).toBe(30 * 60_000);
    expect(msUntilNextCheck(start, 30, at(29))).toBe(60_000);
    expect(msUntilNextCheck(start, 30, at(31))).toBe(29 * 60_000);
  });

  it('count whole minutes played and say them plainly', () => {
    expect(minutesPlayed(start, at(61.5))).toBe(61);
    expect(playedLabel(1)).toBe('1 minute');
    expect(playedLabel(90)).toBe('1 hour 30 minutes');
    expect(playedLabel(120)).toBe('2 hours');
  });
});
