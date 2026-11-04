import type { ReactNode } from 'react';
import { errorMessage } from './form-error';

export const primaryButtonClass =
  'rounded-full bg-pine px-4 py-2 text-sm text-card disabled:opacity-50';
export const secondaryButtonClass =
  'rounded-full border border-line bg-card px-4 py-2 text-sm disabled:opacity-50';

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
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="font-serif text-4xl">{title}</h1>
      {lede ? <p className="mt-3 max-w-2xl text-lg text-mist">{lede}</p> : null}
      <div className="mt-8">{children}</div>
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
        <p role="alert" className="rounded-lg bg-[#f8ebe7] px-3 py-2 text-sm text-clay">
          {errorMessage(error)}
        </p>
        <button type="button" className={secondaryButtonClass} onClick={onRetry}>
          Try again
        </button>
      </div>
    );
  }
  if (isPending) {
    return <p>Loading…</p>;
  }
  return children;
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-3xl border border-dashed border-line bg-card px-6 py-8 text-mist">
      {children}
    </p>
  );
}
