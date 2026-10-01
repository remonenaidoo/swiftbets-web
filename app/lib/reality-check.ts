// When the next reality-check reminder is due, counted from when this browser session began.

/** Milliseconds until the next whole interval after <now>, measured from <startedAt>. */
export function msUntilNextCheck(startedAt: Date, intervalMinutes: number, now: Date): number {
  const interval = intervalMinutes * 60_000;
  const elapsed = Math.max(0, now.getTime() - startedAt.getTime());
  return interval - (elapsed % interval);
}

/** Whole minutes played so far, for the reminder's wording. */
export function minutesPlayed(startedAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 60_000));
}

export function playedLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours} hour${hours === 1 ? '' : 's'}${rest ? ` ${rest} minute${rest === 1 ? '' : 's'}` : ''}`;
}
