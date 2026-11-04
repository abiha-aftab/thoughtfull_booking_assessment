import type { ReactNode } from 'react';
import { errorMessage } from './form-error';

export const primaryButtonClass =
  'inline-flex items-center justify-center rounded-xl bg-pine px-4 py-2 text-sm font-semibold text-paper shadow-[0_8px_24px_rgb(61_207_155_/_0.18)] hover:bg-pine-dark disabled:opacity-50';
export const secondaryButtonClass =
  'inline-flex items-center justify-center rounded-xl border border-hairline bg-chip px-4 py-2 text-sm font-medium text-ink hover:border-pine hover:bg-chip-strong disabled:opacity-50';

export function Page({
  title,
  lede,
  children,
}: {
  title: string;
  lede?: string | undefined;
  children: ReactNode;
}) {
  return (
    <main className="rise mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
      {lede ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-mist sm:text-base">{lede}</p>
      ) : null}
      <div className="mt-6">{children}</div>
    </main>
  );
}

export function QueryState({
  isPending,
  isError,
  error,
  onRetry,
  children,
}: {
  isPending: boolean;
  isError: boolean;
  error: unknown;
  onRetry: () => void;
  children: ReactNode;
}) {
  if (isError) {
    return (
      <div className="space-y-4">
        <p role="alert" className="rounded-xl bg-clay-soft px-3 py-2 text-sm text-clay">
          {errorMessage(error)}
        </p>
        <button type="button" className={secondaryButtonClass} onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }
  if (isPending) {
    return <p className="text-sm text-mist">Loading…</p>;
  }
  return children;
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-line bg-card px-5 py-8 text-sm text-mist">
      {children}
    </p>
  );
}
