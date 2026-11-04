import { Link, useSearchParams } from 'react-router-dom';
import { timezoneAbbreviation, timezoneLabel } from '../auth/paths';
import { useProfessionals } from '../booking/queries';
import { EmptyNote, Page, QueryState, secondaryButtonClass } from '../components/page';

function initials(name: string): string {
  const letters = name
    .split(/\s+/)
    .filter((part) => part.length > 0)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('');
  return letters.toUpperCase();
}

function pageNumber(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mist"
    >
      <circle cx="8.5" cy="8.5" r="5.25" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12.5 12.5 17 17"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function ProfessionalsPage() {
  const [params, setParams] = useSearchParams();
  const rawSearch = (params.get('search') ?? '').slice(0, 80);
  const search = rawSearch.trim();
  const page = pageNumber(params.get('page'));
  const query = useProfessionals(page, search);
  const result = query.data;
  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  function writeSearch(nextRaw: string): void {
    const next = nextRaw.slice(0, 80);
    const nextParams = new URLSearchParams(params);
    if (next.trim().length > 0) {
      nextParams.set('search', next);
    } else {
      nextParams.delete('search');
    }
    if (next.trim() !== search) {
      nextParams.delete('page');
    }
    setParams(nextParams, { replace: true });
  }

  return (
    <Page
      title="Professionals"
      lede="Choose someone to meet with. Open times are 50 minutes and follow their working hours."
    >
      <form
        className="mb-5"
        onSubmit={(event) => {
          event.preventDefault();
        }}
      >
        <label className="block text-sm">
          <span className="font-semibold">Search by name</span>
          <span className="relative mt-1.5 block">
            <SearchIcon />
            <input
              className="field w-full rounded-xl py-3 pr-16 pl-10"
              value={rawSearch}
              onChange={(event) => {
                writeSearch(event.target.value);
              }}
              name="search"
              placeholder="Try Priya, Avery, Jordan…"
            />
            {rawSearch.length > 0 ? (
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-mist hover:bg-chip-strong hover:text-ink"
                onClick={() => {
                  writeSearch('');
                }}
              >
                Clear
              </button>
            ) : null}
          </span>
        </label>
      </form>
      <QueryState
        isPending={query.isPending}
        isError={query.isError}
        error={query.error}
        onRetry={() => {
          void query.refetch();
        }}
      >
        {result && result.professionals.length === 0 ? (
          <EmptyNote>
            {search.length > 0 ? 'No professionals match that search.' : 'No professionals yet.'}
          </EmptyNote>
        ) : null}
        {result && result.professionals.length > 0 ? (
          <p className="mb-4 text-sm text-mist">
            Showing {(page - 1) * result.pageSize + 1}–
            {Math.min(page * result.pageSize, result.total)} of {result.total}
            {search.length > 0 ? ` matching “${search}”` : ''}
          </p>
        ) : null}
        <ul className="grid gap-4 sm:grid-cols-2">
          {result?.professionals.map((professional, index) => {
            const zone = timezoneAbbreviation(professional.timezone) ?? professional.timezone;
            return (
              <li
                key={professional.id}
                className="rise"
                style={{ animationDelay: `${Math.min(index, 8) * 45}ms` }}
              >
                <Link
                  to={`/professionals/${professional.id}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-card p-5 hover:border-pine hover:shadow-[0_18px_40px_-24px_rgb(61_207_155_/_0.85)]"
                >
                  <span className="flex items-start gap-4">
                    <span
                      aria-hidden="true"
                      className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-pine-soft text-base font-semibold text-pine ring-1 ring-pine/30 transition group-hover:bg-pine group-hover:text-paper group-hover:ring-pine"
                    >
                      {initials(professional.name)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <h2 className="truncate text-lg font-semibold tracking-tight">
                        {professional.name}
                      </h2>
                      <p className="mt-1 truncate text-sm font-medium text-pine">
                        {professional.title}
                      </p>
                    </span>
                  </span>
                  <p className="mt-4 line-clamp-2 min-h-12 text-sm leading-6 text-mist">
                    {professional.bio}
                  </p>
                  <span className="mt-4 flex flex-wrap gap-2">
                    <span className="rounded-full bg-pine-soft px-2.5 py-1 text-xs font-semibold text-pine">
                      {zone}
                    </span>
                    <span className="rounded-full bg-chip px-2.5 py-1 text-xs font-medium text-ink">
                      50 min
                    </span>
                  </span>
                  <span className="mt-2 text-xs text-mist" title={professional.timezone}>
                    {timezoneLabel(professional.timezone)}
                  </span>
                  <span className="mt-4 flex items-center justify-between border-t border-line pt-4 text-sm font-semibold text-pine">
                    View open times
                    <span
                      aria-hidden="true"
                      className="inline-block transition duration-200 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
        {result && result.total > result.pageSize ? (
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-card px-4 py-3">
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={page <= 1}
              onClick={() => {
                const nextParams = new URLSearchParams(params);
                nextParams.set('page', String(page - 1));
                setParams(nextParams);
              }}
            >
              Previous
            </button>
            <p className="text-sm font-medium">
              Page {page} <span className="text-mist">of {pageCount}</span>
            </p>
            <button
              type="button"
              className={secondaryButtonClass}
              disabled={page * result.pageSize >= result.total}
              onClick={() => {
                const nextParams = new URLSearchParams(params);
                nextParams.set('page', String(page + 1));
                setParams(nextParams);
              }}
            >
              Next
            </button>
          </div>
        ) : null}
      </QueryState>
    </Page>
  );
}
