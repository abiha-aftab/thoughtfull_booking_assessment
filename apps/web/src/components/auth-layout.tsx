import type { ReactNode } from 'react';

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
    <main className="mx-auto grid min-h-svh max-w-5xl items-center gap-12 px-6 py-16 md:grid-cols-[1.1fr_0.9fr]">
      <section>
        <p className="font-serif text-4xl text-pine-dark">ThoughtFull</p>
        <h1 className="mt-6 font-serif text-5xl leading-tight">{title}</h1>
        <p className="mt-4 max-w-md text-lg text-mist">{lede}</p>
      </section>
      <section className="rounded-3xl border border-line bg-card p-8 shadow-[0_20px_50px_rgb(28_38_34_/_0.06)]">
        {children}
      </section>
    </main>
  );
}
