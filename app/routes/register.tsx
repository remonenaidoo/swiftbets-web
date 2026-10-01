import { data, Form, Link, useNavigation } from 'react-router';
import type { Route } from './+types/register';
import { Card, Field, Notice, Submit } from '../components/Form';
import { accountErrorMessage, currencies, minimumPasswordLength, validateRegistration, type RegistrationForm } from '../lib/account';
import { gateway } from '../lib/gateway.server';

export const meta: Route.MetaFunction = () => [{ title: 'Open an account · SwiftBets' }];

export async function action({ request, context }: Route.ActionArgs) {
  const body = await request.formData();
  const form: RegistrationForm = {
    email: String(body.get('email') ?? '').trim(),
    password: String(body.get('password') ?? ''),
    dateOfBirth: String(body.get('dateOfBirth') ?? '').trim(),
    currency: String(body.get('currency') ?? ''),
    acceptedTerms: body.get('acceptedTerms') === 'on',
  };
  const errors = validateRegistration(form, new Date());
  if (Object.keys(errors).length > 0) return data({ errors, sentTo: null, serverError: null, email: form.email }, { status: 400 });

  const response = await gateway(context, request, '/auth/register', {
    method: 'POST',
    body: { email: form.email, password: form.password, dateOfBirth: form.dateOfBirth, country: 'ZA', currency: form.currency },
  });
  if (!response.ok) {
    return data({ errors: {}, sentTo: null, serverError: accountErrorMessage(response.error?.code, response.error?.detail ?? response.error?.title), email: form.email }, { status: response.status });
  }
  return { errors: {}, sentTo: form.email, serverError: null, email: form.email };
}

export default function Register({ actionData }: Route.ComponentProps) {
  const busy = useNavigation().state === 'submitting';
  if (actionData?.sentTo) {
    return (
      <Card title="Check your email">
        <Notice tone="success">We sent a link to {actionData.sentTo}. Open it within 24 hours to confirm your address, then sign in.</Notice>
        <Link to="/account/sign-in" className="font-semibold text-accent">
          Go to sign in
        </Link>
      </Card>
    );
  }

  const errors: Partial<Record<keyof RegistrationForm, string>> = actionData?.errors ?? {};
  return (
    <Card title="Open an account">
      <Form method="post" className="flex flex-col gap-md" noValidate>
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={actionData?.email} error={errors.email} required />
        <Field label={`Password (at least ${minimumPasswordLength} characters)`} name="password" type="password" autoComplete="new-password" error={errors.password} required />
        <Field label="Date of birth (YYYY-MM-DD)" name="dateOfBirth" inputMode="numeric" placeholder="1990-04-23" error={errors.dateOfBirth} required />
        <fieldset className="flex flex-col gap-xs">
          <legend className="text-sm font-medium">Currency</legend>
          <div className="flex gap-md">
            {currencies.map((currency) => (
              <label key={currency} className="flex items-center gap-xs">
                <input type="radio" name="currency" value={currency} defaultChecked={currency === 'ZAR'} />
                {currency}
              </label>
            ))}
          </div>
          {errors.currency ? <p className="text-sm text-negative">{errors.currency}</p> : null}
        </fieldset>
        <label className="flex items-start gap-sm text-sm">
          <input type="checkbox" name="acceptedTerms" className="mt-1" aria-describedby={errors.acceptedTerms ? 'terms-error' : undefined} />
          I am 18 or older and accept the terms and the responsible gambling policy.
        </label>
        {errors.acceptedTerms ? (
          <p id="terms-error" className="text-sm text-negative">
            {errors.acceptedTerms}
          </p>
        ) : null}
        {actionData?.serverError ? <Notice tone="error">{actionData.serverError}</Notice> : null}
        <Submit busy={busy}>Open account</Submit>
      </Form>
      <Link to="/account/sign-in" className="font-semibold text-accent">
        Already have an account? Sign in
      </Link>
    </Card>
  );
}
