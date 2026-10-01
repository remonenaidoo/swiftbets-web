import { Form, Link, NavLink } from 'react-router';

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  return (
    <header className="border-b border-border bg-surface-raised">
      <div className="mx-auto flex max-w-5xl items-center gap-md px-md py-sm">
        <Link to="/" className="text-lg font-bold tracking-wide">
          SWIFT<span className="text-accent">BETS</span>
        </Link>
        <nav aria-label="Account" className="ml-auto flex items-center gap-sm">
          {signedIn ? (
            <>
              <NavLink to="/account" className="rounded-md px-sm py-xs hover:bg-selected">
                My account
              </NavLink>
              <Form method="post" action="/account/sign-out">
                <button type="submit" className="rounded-md px-sm py-xs hover:bg-selected">
                  Sign out
                </button>
              </Form>
            </>
          ) : (
            <>
              <NavLink to="/account/sign-in" className="rounded-md px-sm py-xs hover:bg-selected">
                Sign in
              </NavLink>
              <NavLink to="/account/register" className="rounded-md bg-accent-strong px-sm py-xs font-semibold text-on-accent">
                Join
              </NavLink>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
