import type { ReactNode } from 'react';
import { ThemeToggle } from './theme-toggle';

export function AuthLayout({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-svh flex-col px-4 py-10">
      <div className="flex justify-end">
        <ThemeToggle />
      </div>
      <div className="m-auto w-full max-w-md">
        <p className="text-center text-lg font-semibold tracking-tight text-pine">ThoughtFull</p>
        <section className="rise mt-5 rounded-2xl border border-hairline bg-card/80 p-6 shadow-[0_24px_80px_rgb(0_0_0_/_0.28)] backdrop-blur sm:p-8">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-mist">{lede}</p>
          <div className="mt-6">{children}</div>
        </section>
      </div>
    </main>
  );
}
