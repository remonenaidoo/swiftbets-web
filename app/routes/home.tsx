import { Link } from 'react-router';
import type { Route } from './+types/home';

export const meta: Route.MetaFunction = () => [{ title: 'SwiftBets' }, { name: 'description', content: 'Sports betting for South Africa.' }];

export default function Home() {
  return (
    <section aria-labelledby="home-title" className="flex flex-col gap-md">
      <h1 id="home-title" className="text-3xl font-bold">
        Bet on the matches you follow
      </h1>
      <p className="text-text-muted">Football from the leagues you watch, with live prices. You must be 18 or older to play. Gamble responsibly.</p>
      <div className="flex gap-sm">
        <Link to="/account/register" className="rounded-md bg-accent-strong px-md py-sm font-semibold text-on-accent">
          Open an account
        </Link>
        <Link to="/account/sign-in" className="rounded-md border border-border px-md py-sm">
          Sign in
        </Link>
      </div>
    </section>
  );
}
