import { Form, Link, redirect } from 'react-router';
import type { Route } from './+types/account';
import { Card, Notice } from '../components/Form';
import { cookieHeaders, currentSession, gateway } from '../lib/gateway.server';

export const meta: Route.MetaFunction = () => [{ title: 'My account · SwiftBets' }];

interface Profile {
  email: string | null;
  currency: string;
  emailVerified: boolean;
}

interface Device {
  id: string;
  device: string;
  createdAt: string;
  lastSeenAt: string;
  current: boolean;
}

export async function loader({ request, context }: Route.LoaderArgs) {
  if (!(await currentSession(context, request))) throw redirect('/account/sign-in');
  const [profile, devices] = await Promise.all([gateway<Profile>(context, request, '/profile'), gateway<Device[]>(context, request, '/session/devices')]);
  return { profile: profile.data ?? null, devices: devices.data ?? [] };
}

export async function action({ request, context }: Route.ActionArgs) {
  const body = await request.formData();
  const device = String(body.get('device') ?? '');
  const response = await gateway(context, request, device === 'all' ? '/session/devices' : `/session/devices/${encodeURIComponent(device)}`, { method: 'DELETE' });
  // Ending this browser's own session signs it out; any other device just drops off the list.
  const signedOut = response.setCookies.some((cookie) => /max-age=0|expires=thu, 01 jan 1970/i.test(cookie));
  return signedOut ? redirect('/account/sign-in', { headers: cookieHeaders(response) }) : { revoked: response.ok };
}

const when = (iso: string) => new Date(iso).toLocaleString('en-ZA', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Johannesburg' });

export default function Account({ loaderData, actionData }: Route.ComponentProps) {
  const { profile, devices } = loaderData;
  return (
    <div className="flex flex-col gap-lg">
      <Card title="My account">
        <dl className="grid grid-cols-[max-content_1fr] gap-x-md gap-y-xs">
          <dt className="text-text-muted">Email</dt>
          <dd>{profile?.email ?? 'Not set'}</dd>
          <dt className="text-text-muted">Currency</dt>
          <dd>{profile?.currency ?? '-'}</dd>
          <dt className="text-text-muted">Email confirmed</dt>
          <dd>{profile?.emailVerified ? 'Yes' : 'Not yet'}</dd>
        </dl>
        <Link to="/account/safer-gambling" className="font-semibold text-accent underline">
          Safer gambling: limits, session time and breaks
        </Link>
      </Card>

      <section aria-labelledby="devices-title" className="rounded-lg border border-border bg-surface-raised p-lg">
        <h2 id="devices-title" className="mb-md text-xl font-semibold">
          Signed-in devices
        </h2>
        {actionData?.revoked ? <Notice tone="success">That device is signed out.</Notice> : null}
        <ul className="mt-sm flex flex-col gap-sm">
          {devices.map((device) => (
            <li key={device.id} className="flex items-center justify-between gap-md rounded-md border border-border px-sm py-xs">
              <div>
                <p className="font-medium">
                  {device.device}
                  {device.current ? <span className="ml-xs text-sm text-positive">(this device)</span> : null}
                </p>
                <p className="text-sm text-text-muted">Last active {when(device.lastSeenAt)}</p>
              </div>
              <Form method="post">
                <input type="hidden" name="device" value={device.id} />
                <button type="submit" className="rounded-md border border-border px-sm py-xs" aria-label={`Sign out ${device.device}${device.current ? ' (this device)' : ''}`}>
                  Sign out
                </button>
              </Form>
            </li>
          ))}
        </ul>
        <Form method="post" className="mt-md">
          <input type="hidden" name="device" value="all" />
          <button type="submit" className="text-sm font-semibold text-negative">
            Sign out everywhere
          </button>
        </Form>
      </section>
    </div>
  );
}
