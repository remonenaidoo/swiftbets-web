// Serves the built site: static assets, then server rendering with a fresh CSP nonce per request (ADR 0003).
import { randomBytes } from 'node:crypto';
import { createRequestHandler } from '@react-router/express';
import compression from 'compression';
import express from 'express';

const port = Number(process.env.PORT ?? 8080);
const gatewayUrl = (process.env.GATEWAY_URL ?? 'http://gateway:8080').replace(/\/$/, '');
// Payment providers' hosted checkout pages the deposit form may hand the browser on to.
const checkoutOrigins = (process.env.CHECKOUT_ORIGINS ?? 'https://checkout.paystack.com').split(/\s+/).filter(Boolean).join(' ');
const build = await import('./build/server/index.js');

const app = express();
app.disable('x-powered-by');
app.use(compression());
app.get('/healthz', (_req, res) => res.type('text').send('ok'));
app.use('/site-assets', express.static('build/client/site-assets', { immutable: true, maxAge: '1y' }));
app.use(express.static('build/client', { maxAge: '1h' }));

app.use((_req, res, next) => {
  const nonce = randomBytes(16).toString('base64');
  res.locals.nonce = nonce;
  res.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      `script-src 'nonce-${nonce}' 'strict-dynamic'`,
      "style-src 'self'",
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'none'",
      `form-action 'self' ${checkoutOrigins}`,
      "frame-ancestors 'none'",
    ].join('; '),
  );
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.all(
  '/{*path}',
  createRequestHandler({
    build,
    getLoadContext: (_req, res) => ({ nonce: res.locals.nonce, gatewayUrl }),
  }),
);

app.listen(port, () => console.log(`swiftbets-web on ${port}, gateway ${gatewayUrl}`));
