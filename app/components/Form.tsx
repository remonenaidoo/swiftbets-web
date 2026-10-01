import { useId } from 'react';

export function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby="card-title" className="rounded-lg border border-border bg-surface-raised p-lg">
      <h1 id="card-title" className="mb-md text-2xl font-semibold">
        {title}
      </h1>
      <div className="flex flex-col gap-md">{children}</div>
    </section>
  );
}

export function Field({ label, name, error, ...input }: { label: string; name: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="flex flex-col gap-xs">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        name={name}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="rounded-md border border-border bg-surface-sunken px-sm py-xs text-text"
        {...input}
      />
      {error ? (
        <p id={errorId} className="text-sm text-negative">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Notice({ tone, children }: { tone: 'success' | 'error' | 'info'; children: React.ReactNode }) {
  const colour = tone === 'success' ? 'border-positive text-positive' : tone === 'error' ? 'border-negative text-negative' : 'border-border text-text';
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-md border px-sm py-xs ${colour}`}>
      {children}
    </p>
  );
}

export function Submit({ children, busy }: { children: React.ReactNode; busy?: boolean }) {
  return (
    <button type="submit" disabled={busy} className="rounded-md bg-accent-strong px-md py-sm font-semibold text-on-accent disabled:opacity-60">
      {busy ? 'Please wait…' : children}
    </button>
  );
}
