import { describe, expect, it } from 'vitest';
import { accountErrorMessage, ageOn, validateRegistration } from './account';

const today = new Date(Date.UTC(2026, 9, 1));
const valid = { email: 'new.punter@example.com', password: 'correct horse battery', dateOfBirth: '1990-04-23', currency: 'ZAR', acceptedTerms: true };

describe('registration rules', () => {
  it('accepts a complete adult registration', () => {
    expect(validateRegistration(valid, today)).toEqual({});
  });

  it('turns eighteen on the birthday, not the day before', () => {
    expect(ageOn('2008-10-01', today)).toBe(18);
    expect(ageOn('2008-10-02', today)).toBe(17);
    expect(validateRegistration({ ...valid, dateOfBirth: '2008-10-02' }, today).dateOfBirth).toMatch(/18 or older/);
  });

  it('rejects impossible and malformed dates', () => {
    expect(ageOn('2001-02-29', today)).toBeNull();
    expect(ageOn('01/02/1990', today)).toBeNull();
  });

  it('lists every problem at once', () => {
    const errors = validateRegistration({ email: 'nope', password: 'short', dateOfBirth: '', currency: 'EUR', acceptedTerms: false }, today);
    expect(Object.keys(errors).sort()).toEqual(['acceptedTerms', 'currency', 'dateOfBirth', 'email', 'password']);
  });

  it('never echoes an unknown server message', () => {
    expect(accountErrorMessage('something_internal', 'stack trace here')).toBe('Something went wrong. Try again.');
    expect(accountErrorMessage('invalid_credentials')).toBe('Email or password is incorrect.');
  });
});
