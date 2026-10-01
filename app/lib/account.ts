// Mirrors identity's rules so the form can list every problem at once; identity stays the authority.

export const minimumAge = 18;
export const minimumPasswordLength = 10;
export const maximumPasswordLength = 128;
export const currencies = ['ZAR', 'USD'] as const;

export interface RegistrationForm {
  email: string;
  password: string;
  dateOfBirth: string;
  currency: string;
  acceptedTerms: boolean;
}

export type RegistrationErrors = Partial<Record<keyof RegistrationForm, string>>;

export function isPlausibleEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** Whole years between a YYYY-MM-DD birthday and today, or null when the date is not a real one. */
export function ageOn(dateOfBirth: string, today: Date): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const birth = new Date(Date.UTC(year, month - 1, day));
  if (birth.getUTCFullYear() !== year || birth.getUTCMonth() !== month - 1 || birth.getUTCDate() !== day) return null;
  let age = today.getUTCFullYear() - year;
  const beforeBirthday = today.getUTCMonth() < month - 1 || (today.getUTCMonth() === month - 1 && today.getUTCDate() < day);
  if (beforeBirthday) age -= 1;
  return age;
}

export function passwordProblem(password: string): string | undefined {
  if (password.length < minimumPasswordLength) return `Use at least ${minimumPasswordLength} characters.`;
  if (password.length > maximumPasswordLength) return `Use at most ${maximumPasswordLength} characters.`;
  return undefined;
}

export function validateRegistration(form: RegistrationForm, today: Date): RegistrationErrors {
  const errors: RegistrationErrors = {};
  if (!isPlausibleEmail(form.email)) errors.email = 'Enter a valid email address.';
  const password = passwordProblem(form.password);
  if (password) errors.password = password;
  const age = ageOn(form.dateOfBirth, today);
  if (age === null) errors.dateOfBirth = 'Enter your date of birth as YYYY-MM-DD.';
  else if (age < minimumAge) errors.dateOfBirth = `You must be ${minimumAge} or older to open an account.`;
  if (!currencies.includes(form.currency as (typeof currencies)[number])) errors.currency = 'Choose ZAR or USD.';
  if (!form.acceptedTerms) errors.acceptedTerms = 'Confirm you are 18 or older and accept the terms.';
  return errors;
}

/** Safe, specific wording for identity's refusal codes; anything unknown gets a neutral message. */
export function accountErrorMessage(code: string | undefined, fallback?: string): string {
  switch (code) {
    case 'invalid_credentials':
      return 'Email or password is incorrect.';
    case 'account_locked':
      return 'Too many failed attempts. Try again in a few minutes or reset your password.';
    case 'account_suspended':
    case 'account_closed':
      return 'This account cannot sign in. Contact support.';
    case 'account_self_excluded':
      return 'This account is self-excluded and cannot sign in until the exclusion ends.';
    case 'underage':
      return `You must be ${minimumAge} or older to open an account.`;
    case 'token_invalid':
      return 'This link has expired or was already used. Request a new one.';
    case 'password_weak':
    case 'email_invalid':
    case 'currency_not_supported':
    case 'country_not_supported':
      return fallback ?? 'Check your details and try again.';
    default:
      return 'Something went wrong. Try again.';
  }
}
