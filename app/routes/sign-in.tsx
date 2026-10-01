import { data, Form, Link, redirect, useNavigation } from 'react-router';
import type { Route } from './+types/sign-in';
import { Card, Field, Notice, Submit } from '../components/Form';
import { accountErrorMessage } from '../lib/account';
import { cookieHeaders, currentSession, gateway } from '../lib/gateway.server';

export const meta: Route.MetaFunction = () => [{ title: 'Sign in · SwiftBets' }];

export async function loader({ request, context }: Route.LoaderArgs) {
  if (await currentSession(context, request)) throw redirect('/account');
  return { timeLimit: new URL(request.url).searchParams.get('ended') === 'time-limit' };
}

export async function action({ request, context }: Route.ActionArgs) {
  const body = await request.formData();
  const login = String(body.get('email') ?? '').trim();
  const password = String(body.get('password') ?? '');
  const response = await gateway(context, request, '/session/login', { method: 'POST', body: { username: login, password } });
  if (!response.ok) return data({ error: accountErrorMessage(response.error?.code), email: login }, { status: response.status });
  return redirect('/account', { headers: cookieHeaders(response) });
}

export default function SignIn({ loaderData, actionData }: Route.ComponentProps) {
  const busy = useNavigation().state === 'submitting';
  return (
    <Card title="Sign in">
      {loaderData?.timeLimit ? <Notice tone="info">You reached the session time you set and were signed out. Take a break before you play again.</Notice> : null}
      <Form method="post" className="flex flex-col gap-md">
        <Field label="Email" name="email" type="email" autoComplete="email" defaultValue={actionData?.email} required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
        {actionData?.error ? <Notice tone="error">{actionData.error}</Notice> : null}
        <Submit busy={busy}>Sign in</Submit>
      </Form>
      <div className="flex justify-between text-sm">
        <Link to="/account/forgot-password" className="text-accent">
          Forgot your password?
        </Link>
        <Link to="/account/register" className="text-accent">
          Open an account
        </Link>
      </div>
    </Card>
  );
}
