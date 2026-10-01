// A stand-in for the gateway and identity: the session cookie, CSRF rule and account endpoints the site uses,
// with in-memory accounts. GET /__emails?to= plays the part of Mailpit and returns the last link token sent.
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';

const port = Number(process.env.FAKE_GATEWAY_PORT ?? 4011);
const users = new Map();
const sessions = new Map();
const emails = new Map();
const compliance = new Map();
const day = 24 * 60 * 60 * 1000;

const send = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': body === undefined ? 'text/plain' : 'application/json', ...headers });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
const problem = (res, status, code, title) => send(res, status, { status, code, title, correlationId: 'fake' }, { 'Content-Type': 'application/problem+json' });
const cookieOf = (req) => /(?:^|;\s*)sb_sid=([^;]+)/.exec(req.headers.cookie ?? '')?.[1];
const clear = 'sb_sid=; Path=/; HttpOnly; SameSite=Lax; expires=Thu, 01 Jan 1970 00:00:00 GMT';

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fake');
  let body = {};
  if (req.method !== 'GET') {
    let raw = '';
    for await (const chunk of req) raw += chunk;
    body = raw ? JSON.parse(raw) : {};
    if (req.headers['x-swiftbets-csrf'] !== '1') return problem(res, 403, 'csrf_required', 'CSRF header missing');
  }
  const session = sessions.get(cookieOf(req));
  const route = `${req.method} ${url.pathname.replace(/\/[0-9a-f-]{36}$/, '/:id')}`;

  switch (route) {
    case 'GET /__emails':
      return send(res, 200, emails.get(url.searchParams.get('to')) ?? null);
    case 'POST /api/auth/register': {
      const email = String(body.email).toLowerCase();
      if (!users.has(email)) users.set(email, { id: randomUUID(), email, password: body.password, currency: body.currency, verified: false });
      emails.set(email, { kind: 'verify', token: `verify-${users.get(email).id}` });
      return send(res, 202, { message: 'Check your email to confirm your address.' });
    }
    case 'POST /api/auth/verify-email': {
      const user = [...users.values()].find((u) => `verify-${u.id}` === body.token && !u.verified);
      if (!user) return problem(res, 400, 'token_invalid', 'Token invalid');
      user.verified = true;
      return send(res, 204);
    }
    case 'POST /api/auth/verify-email/resend':
    case 'POST /api/auth/password-reset': {
      const user = users.get(String(body.email).toLowerCase());
      if (user && route.endsWith('password-reset')) emails.set(user.email, { kind: 'reset', token: `reset-${user.id}` });
      return send(res, 202);
    }
    case 'POST /api/auth/password-reset/confirm': {
      const user = [...users.values()].find((u) => `reset-${u.id}` === body.token);
      if (!user) return problem(res, 400, 'token_invalid', 'Token invalid');
      user.password = body.password;
      for (const [id, s] of sessions) if (s.userId === user.id) sessions.delete(id);
      return send(res, 204);
    }
    case 'POST /api/session/login': {
      const user = users.get(String(body.username).toLowerCase());
      if (!user || user.password !== body.password) return problem(res, 401, 'invalid_credentials', 'Invalid credentials');
      const id = randomUUID();
      const now = new Date().toISOString();
      sessions.set(id, { id, userId: user.id, device: req.headers['user-agent'] ?? 'unknown device', createdAt: now, lastSeenAt: now });
      return send(res, 200, { subject: user.id, roles: ['Customer'] }, { 'Set-Cookie': `sb_sid=${id}; Path=/; HttpOnly; SameSite=Lax` });
    }
  }

  if (!session) return problem(res, 401, 'unauthenticated', 'Sign in');
  const user = [...users.values()].find((u) => u.id === session.userId);
  switch (route) {
    case 'GET /api/session':
      return send(res, 200, { subject: user.id, roles: ['Customer'], expiresAt: new Date(Date.now() + 600_000).toISOString() });
    case 'GET /api/profile':
      return send(res, 200, { userId: user.id, email: user.email, emailVerified: user.verified, currency: user.currency, status: 'Active' });
    case 'GET /api/session/devices':
      return send(res, 200, [...sessions.values()].filter((s) => s.userId === user.id).map((s) => ({ id: s.id, device: s.device, createdAt: s.createdAt, lastSeenAt: s.lastSeenAt, current: s.id === session.id })));
    case 'DELETE /api/session/devices/:id': {
      const id = url.pathname.split('/').pop();
      if (sessions.get(id)?.userId !== user.id) return problem(res, 404, 'session_not_found', 'No such session');
      sessions.delete(id);
      return send(res, 204, undefined, id === session.id ? { 'Set-Cookie': clear } : {});
    }
    case 'DELETE /api/session/devices':
      for (const [id, s] of sessions) if (s.userId === user.id) sessions.delete(id);
      return send(res, 204, undefined, { 'Set-Cookie': clear });
    case 'GET /api/me/compliance':
      return send(res, 200, view(user.id));
    case 'PUT /api/me/session-settings': {
      const state = stateOf(user.id);
      const bad = (v, lo, hi) => v !== null && (v < lo || v > hi);
      if (bad(body.sessionLimitMinutes, 15, 1440)) return problem(res, 400, 'invalid_session_limit', 'bad');
      if (bad(body.realityCheckMinutes, 10, 240)) return problem(res, 400, 'invalid_reality_check', 'bad');
      Object.assign(state, { sessionLimitMinutes: body.sessionLimitMinutes, realityCheckMinutes: body.realityCheckMinutes });
      return send(res, 200, view(user.id));
    }
    case 'POST /api/me/exclusions': {
      const state = stateOf(user.id);
      if (state.restrictions.length) return problem(res, 422, 'already_excluded', 'excluded');
      const ends = body.kind === 'selfExclusion' ? new Date(Date.now() + body.months * 30 * day) : new Date(Date.now() + body.days * day);
      state.restrictions.push({ kind: body.kind, startsAt: new Date().toISOString(), endsAt: ends.toISOString(), reason: 'customer request' });
      return send(res, 200, view(user.id));
    }
    case 'POST /api/session/logout':
      sessions.delete(session.id);
      return send(res, 204, undefined, { 'Set-Cookie': clear });
    default: {
      const limit = /^(PUT|DELETE) \/api\/me\/limits\/(deposit|stake|loss)\/(day|week|month)$/.exec(route);
      if (limit) return changeLimit(res, user.id, limit[1], limit[2], limit[3], body);
      return problem(res, 404, 'not_found', `No route ${route}`);
    }
  }
}).listen(port, () => console.log(`fake gateway on ${port}`));

function stateOf(userId) {
  if (!compliance.has(userId)) compliance.set(userId, { limits: new Map(), restrictions: [], sessionLimitMinutes: null, realityCheckMinutes: null });
  return compliance.get(userId);
}

function view(userId) {
  const state = stateOf(userId);
  return {
    limits: [...state.limits.values()],
    restrictions: state.restrictions,
    sessionLimitMinutes: state.sessionLimitMinutes,
    realityCheckMinutes: state.realityCheckMinutes,
    kycStatus: 'notStarted',
    excluded: state.restrictions.length > 0,
  };
}

// Compliance's rule in miniature: lower at once, raise or remove after 24 hours.
function changeLimit(res, userId, method, kind, period, body) {
  const state = stateOf(userId);
  const key = `${kind}-${period}`;
  const current = state.limits.get(key);
  if (method === 'DELETE') {
    if (!current) return problem(res, 404, 'limit_not_found', 'none');
    state.limits.set(key, { ...current, pendingAmount: null, pendingEffectiveAt: new Date(Date.now() + day).toISOString(), pendingRemoval: true });
    return send(res, 200, view(userId));
  }
  if (!(body.amount > 0)) return problem(res, 400, 'invalid_limit', 'bad');
  if (!current || body.amount <= current.amount) {
    state.limits.set(key, { kind, period, amount: body.amount, currency: body.currency, pendingAmount: null, pendingEffectiveAt: null, pendingRemoval: false });
  } else {
    state.limits.set(key, { ...current, pendingAmount: body.amount, pendingEffectiveAt: new Date(Date.now() + day).toISOString(), pendingRemoval: false });
  }
  return send(res, 200, view(userId));
}
