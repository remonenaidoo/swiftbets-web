import { redirect } from 'react-router';
import type { Route } from './+types/sign-out';
import { cookieHeaders, gateway } from '../lib/gateway.server';

export async function action({ request, context }: Route.ActionArgs) {
  const response = await gateway(context, request, '/session/logout', { method: 'POST' });
  return redirect('/', { headers: cookieHeaders(response) });
}

export function loader() {
  return redirect('/');
}
