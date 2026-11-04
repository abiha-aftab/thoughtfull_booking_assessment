import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { timezoneLabel } from '../auth/paths';
import { useProfessionals } from '../booking/queries';
import { EmptyNote, Page, QueryState, secondaryButtonClass } from '../components/page';

function pageNumber(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }
  return parsed;
}

export function ProfessionalsPage() {
  const [params, setParams] = useSearchParams();
  const search = (params.get('search') ?? '').trim().slice(0, 80);
  const page = pageNumber(params.get('page'));
  const [draft, setDraft] = useState(search);
  const query = useProfessionals(page, search);
  const result = query.data;
  const pageCount = result ? Math.max(1, Math.ceil(result.total / result.pageSize)) : 1;

  return (
    <Page
      title="Professionals"
      lede="Choose someone to meet with. Open times are 50 minutes and follow their working hours."
    >
      <form
        className="mb-6 flex flex-wrap gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const next = draft.trim().slice(0, 80);
          const nextParams = new URLSearchParams();
          if (next.length > 0) {
            nextParams.set('search', next);
          }
          setParams(nextParams);
        }}
      >
        <label className="min-w-64 flex-1 text-sm">
          <span className="font-semibold">Search by name</span>
          <input
            className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            name="search"
          />
        </label>
        <button type="submit" className={`${secondaryButtonClass} self-end`}>
          Search
        </button>
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
        <ul className="grid gap-4">
          {result?.professionals.map((professional) => (
            <li key={professional.id}>
              <Link
                to={`/professionals/${professional.id}`}
                className="block rounded-3xl border border-line bg-card p-6"
              >
                <h2 className="font-serif text-3xl">{professional.name}</h2>
                <p className="mt-1 text-pine">{professional.title}</p>
                <p className="mt-3 max-w-2xl">{professional.bio}</p>
                <p className="mt-3 text-sm text-mist">{timezoneLabel(professional.timezone)}</p>
              </Link>
            </li>
          ))}
        </ul>
        {result && result.total > result.pageSize ? (
          <div className="mt-6 flex items-center gap-3">
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
            <p className="text-sm text-mist">
              Page {page} of {pageCount}
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
