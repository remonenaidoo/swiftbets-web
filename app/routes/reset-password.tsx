import { data, Form, Link } from 'react-router';
import type { Route } from './+types/reset-password';
import { Card, Field, Notice, Submit } from '../components/Form';
import { accountErrorMessage, minimumPasswordLength, passwordProblem } from '../lib/account';
import { gateway } from '../lib/gateway.server';

export const meta: Route.MetaFunction = () => [{ title: 'Choose a new password · SwiftBets' }];

export function loader({ request }: Route.LoaderArgs) {
  return { token: new URL(request.url).searchParams.get('token') };
}

export async function action({ request, context }: Route.ActionArgs) {
  const body = await request.formData();
  const token = String(body.get('token') ?? '');
  const password = String(body.get('password') ?? '');
  const problem = passwordProblem(password);
  if (problem) return data({ done: false, error: problem }, { status: 400 });
  const response = await gateway(context, request, '/auth/password-reset/confirm', { method: 'POST', body: { token, password } });
  if (!response.ok) return data({ done: false, error: accountErrorMessage(response.error?.code, response.error?.detail) }, { status: response.status });
  return { done: true, error: null };
}

export default function ResetPassword({ loaderData, actionData }: Route.ComponentProps) {
  if (!loaderData.token) {
    return (
      <Card title="Reset your password">
        <Notice tone="error">This link is incomplete. Request a new one.</Notice>
        <Link to="/account/forgot-password" className="font-semibold text-accent">
          Request a new link
        </Link>
      </Card>
    );
  }

  if (actionData?.done) {
    return (
      <Card title="Password changed">
        <Notice tone="success">Your password is changed and every device was signed out. Sign in with the new password.</Notice>
        <Link to="/account/sign-in" className="font-semibold text-accent">
          Sign in
        </Link>
      </Card>
    );
  }

  return (
    <Card title="Choose a new password">
      <Form method="post" className="flex flex-col gap-md">
        <input type="hidden" name="token" value={loaderData.token} />
        <Field label={`New password (at least ${minimumPasswordLength} characters)`} name="password" type="password" autoComplete="new-password" required />
        {actionData?.error ? <Notice tone="error">{actionData.error}</Notice> : null}
        <Submit>Change password</Submit>
      </Form>
    </Card>
  );
}
