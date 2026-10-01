import { Form, Link } from 'react-router';
import type { Route } from './+types/verify';
import { Card, Field, Notice, Submit } from '../components/Form';
import { gateway } from '../lib/gateway.server';

export const meta: Route.MetaFunction = () => [{ title: 'Confirm your email · SwiftBets' }];

// The emailed link lands here; the token is single-use, so opening it confirms the address.
export async function loader({ request, context }: Route.LoaderArgs) {
  const token = new URL(request.url).searchParams.get('token');
  if (!token) return { verified: false, missing: true };
  const response = await gateway(context, request, '/auth/verify-email', { method: 'POST', body: { token } });
  return { verified: response.ok, missing: false };
}

export async function action({ request, context }: Route.ActionArgs) {
  const email = String((await request.formData()).get('email') ?? '').trim();
  await gateway(context, request, '/auth/verify-email/resend', { method: 'POST', body: { email } });
  return { resent: true };
}

export default function Verify({ loaderData, actionData }: Route.ComponentProps) {
  return (
    <Card title="Confirm your email">
      {loaderData.verified ? (
        <>
          <Notice tone="success">Your email address is confirmed.</Notice>
          <Link to="/account/sign-in" className="font-semibold text-accent">
            Sign in
          </Link>
        </>
      ) : (
        <>
          <Notice tone="error">{loaderData.missing ? 'This link is incomplete.' : 'This link has expired or was already used.'} Enter your email for a new one.</Notice>
          {actionData?.resent ? (
            <Notice tone="success">If that address still needs confirming, a new link is on its way.</Notice>
          ) : (
            <Form method="post" className="flex flex-col gap-md">
              <Field label="Email" name="email" type="email" autoComplete="email" required />
              <Submit>Send a new link</Submit>
            </Form>
          )}
        </>
      )}
    </Card>
  );
}
