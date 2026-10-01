import { isRouteErrorResponse, Links, Meta, Outlet, Scripts, ScrollRestoration, useRouteError, useRouteLoaderData } from 'react-router';
import type { Route } from './+types/root';
import { currentSession } from './lib/gateway.server';
import { SiteHeader } from './components/SiteHeader';
import './app.css';

export async function loader({ request, context }: Route.LoaderArgs) {
  return { session: await currentSession(context, request), nonce: context.nonce };
}

export function Layout({ children }: { children: React.ReactNode }) {
  const data = useRouteLoaderData<typeof loader>('root');
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <SiteHeader signedIn={!!data?.session} />
        <main className="mx-auto w-full max-w-2xl px-md py-lg">{children}</main>
        <ScrollRestoration nonce={data?.nonce} />
        <Scripts nonce={data?.nonce} />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary() {
  const error = useRouteError();
  const message = isRouteErrorResponse(error) && error.status === 404 ? 'That page does not exist.' : 'Something went wrong. Try again in a moment.';
  return (
    <section aria-labelledby="error-title">
      <h1 id="error-title" className="text-2xl font-semibold">
        {isRouteErrorResponse(error) ? error.status : 'Error'}
      </h1>
      <p className="mt-sm text-text-muted">{message}</p>
    </section>
  );
}
