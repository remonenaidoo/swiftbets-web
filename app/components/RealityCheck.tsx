import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';
import { minutesPlayed, msUntilNextCheck, playedLabel } from '../lib/reality-check';

/** The reminder a customer asked for: how long they have played, with a way to stop or to adjust their limits. */
export function RealityCheck({ startedAt, intervalMinutes, sessionLimitMinutes }: { startedAt: string; intervalMinutes: number; sessionLimitMinutes: number | null }) {
  const [played, setPlayed] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const start = new Date(startedAt);
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      timer = setTimeout(() => {
        setPlayed(minutesPlayed(start, new Date()));
        schedule();
      }, msUntilNextCheck(start, intervalMinutes, new Date()));
    };
    schedule();
    // Marks the reminder as scheduled, which tests wait for before moving the clock.
    dialog.current?.setAttribute('data-armed', '');
    return () => clearTimeout(timer);
  }, [startedAt, intervalMinutes]);

  useEffect(() => {
    if (played !== null && !dialog.current?.open) dialog.current?.showModal();
  }, [played]);

  const left = sessionLimitMinutes !== null && played !== null ? sessionLimitMinutes - played : null;
  return (
    <dialog ref={dialog} aria-labelledby="reality-title" className="m-auto max-w-md rounded-lg border border-border bg-surface-raised p-lg text-text backdrop:bg-black/60">
      <h2 id="reality-title" className="text-xl font-semibold">
        Time check
      </h2>
      <p className="mt-sm">{`You have been signed in for ${playedLabel(played ?? 0)}.`}</p>
      {left !== null && left > 0 ? <p className="mt-xs text-text-muted">{`Your session limit signs you out in ${playedLabel(left)}.`}</p> : null}
      <div className="mt-md flex flex-wrap gap-sm">
        <form method="dialog">
          <button type="submit" className="rounded-md bg-accent-strong px-md py-sm font-semibold text-on-accent">
            Keep going
          </button>
        </form>
        <Link to="/account/safer-gambling" className="rounded-md border border-border px-md py-sm" onClick={() => dialog.current?.close()}>
          Safer gambling
        </Link>
        <form method="post" action="/account/sign-out">
          <button type="submit" className="rounded-md border border-border px-md py-sm">
            Sign out
          </button>
        </form>
      </div>
    </dialog>
  );
}
