# swiftbets-web

The SwiftBets customer site: React Router 7 in framework mode, rendered on the server by Node and served behind the gateway (ADR 0003).

- **Account flows:** register (18+ age gate), confirm email, sign in, forgot and reset password, account details, signed-in devices with per-device and everywhere sign-out.
- **Forms work without JavaScript:** every flow is a server action that calls the gateway and passes its session cookie back.
- **Server-side gateway calls:** loaders and actions forward the visitor's cookie, user agent and correlation id, and send the CSRF header on mutations (`app/lib/gateway.server.ts`).
- **CSP:** `server.mjs` mints a nonce per request: `script-src 'nonce-…' 'strict-dynamic'; style-src 'self'`. There are no inline styles or scripts without a nonce.
- **Styling:** Tailwind v4 on `@swiftbets/design-tokens`; the brand is a build-time import in `app/app.css`.

Image: `ghcr.io/remonenaidoo/swiftbets-site` (port 8080, `GATEWAY_URL` points at the gateway).

## Develop

```bash
npm ci
npm run dev          # Vite dev server
npm test             # unit tests (account rules)
npm run e2e          # build, then Playwright against e2e/fake-gateway.mjs
```

The e2e suite runs on a desktop and a phone profile. It covers:
- the E1 gate flow: register → confirm → sign in → revoke a second device;
- underage refusal, password reset and sign-out;
- forms with JavaScript off;
- axe (WCAG 2.1 AA) on every page;
- a fresh CSP nonce per request.
