// Server-side calls to the gateway on the visitor's behalf: the session cookie, user agent and client address go
// along, mutations carry the CSRF header, and any cookie the gateway sets comes back to be passed to the browser.

export interface GatewayContext {
  gatewayUrl: string;
}

export interface ErrorEnvelope {
  status: number;
  code: string;
  title: string;
  detail?: string;
}

export interface GatewayResponse<T> {
  ok: boolean;
  status: number;
  data: T | undefined;
  error: ErrorEnvelope | undefined;
  setCookies: string[];
}

const forwarded = ['cookie', 'user-agent', 'x-forwarded-for', 'x-correlation-id'];

export async function gateway<T>(context: GatewayContext, request: Request, path: string, init: { method?: string; body?: unknown } = {}): Promise<GatewayResponse<T>> {
  const method = init.method ?? 'GET';
  const headers = new Headers({ Accept: 'application/json' });
  for (const name of forwarded) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (method !== 'GET') headers.set('X-SwiftBets-Csrf', '1');
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');

  const response = await fetch(`${context.gatewayUrl}/api${path}`, {
    method,
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
    redirect: 'manual',
  });
  const text = await response.text();
  const json = text ? (JSON.parse(text) as unknown) : undefined;
  return {
    ok: response.ok,
    status: response.status,
    data: response.ok ? (json as T) : undefined,
    error: response.ok ? undefined : ((json as ErrorEnvelope | undefined) ?? { status: response.status, code: `http_${response.status}`, title: response.statusText }),
    setCookies: response.headers.getSetCookie(),
  };
}

/** Response headers that pass the gateway's cookies on to the browser. */
export function cookieHeaders(response: GatewayResponse<unknown>): Headers {
  const headers = new Headers();
  for (const cookie of response.setCookies) headers.append('Set-Cookie', cookie);
  return headers;
}

export interface Session {
  subject: string;
  roles: string[];
}

export async function currentSession(context: GatewayContext, request: Request): Promise<Session | null> {
  const response = await gateway<Session>(context, request, '/session');
  return response.ok ? (response.data ?? null) : null;
}
