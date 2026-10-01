import { Form, Link } from 'react-router';
import type { Route } from './+types/forgot-password';
import { Card, Field, Notice, Submit } from '../components/Form';
import { gateway } from '../lib/gateway.server';

export const meta: Route.MetaFunction = () => [{ title: 'Reset your password · SwiftBets' }];

// Always the same answer, so the form cannot be used to learn which emails have accounts.
export async function action({ request, context }: Route.ActionArgs) {
  const email = String((await request.formData()).get('email') ?? '').trim();
  await gateway(context, request, '/auth/password-reset', { method: 'POST', body: { email } });
  return { sentTo: email };
}

export default function ForgotPassword({ actionData }: Route.ComponentProps) {
  return (
    <Card title="Reset your password">
      {actionData?.sentTo ? (
        <Notice tone="success">If {actionData.sentTo} has an account, a reset link is on its way. It works for one hour.</Notice>
      ) : (
        <Form method="post" className="flex flex-col gap-md">
          <Field label="Email" name="email" type="email" autoComplete="email" required />
          <Submit>Send reset link</Submit>
        </Form>
      )}
      <Link to="/account/sign-in" className="font-semibold text-accent">
        Back to sign in
      </Link>
    </Card>
  );
}
