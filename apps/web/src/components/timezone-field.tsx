import { useEffect, useId, useRef, useState } from 'react';

export function TimezoneField({
  value,
  options,
  error,
  onChange,
  onBlur,
}: {
  value: string;
  options: readonly string[];
  error?: string | undefined;
  onChange: (value: string) => void;
  onBlur: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const errorId = useId();
  const query = search.trim().toLowerCase();
  const visible =
    query.length === 0 ? options : options.filter((zone) => zone.toLowerCase().includes(query));

  function setMenu(next: boolean): void {
    setOpen(next);
    if (!next) {
      setSearch('');
    }
  }

  useEffect(() => {
    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    searchRef.current?.focus();
    const selected = rootRef.current?.querySelector<HTMLElement>(
      '[role="option"][aria-selected="true"]',
    );
    if (typeof selected?.scrollIntoView === 'function') {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [open]);

  return (
    <div ref={rootRef} className="relative text-sm">
      <label htmlFor="timezone" className="block font-semibold">
        Timezone
      </label>
      <div className="relative mt-1.5">
        <input
          id="timezone"
          name="timezone"
          readOnly
          aria-expanded={open}
          aria-controls={listId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="field w-full cursor-pointer rounded-xl py-2.5 pr-10 pl-3"
          value={value}
          onBlur={onBlur}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            setMenu(!open);
          }}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setMenu(false);
            }
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              setMenu(!open);
            }
          }}
        />
        <button
          type="button"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-md p-1 text-mist hover:text-ink"
          aria-label="Show timezones"
          aria-expanded={open}
          aria-controls={listId}
          onMouseDown={(event) => {
            event.preventDefault();
          }}
          onClick={() => {
            setMenu(!open);
          }}
        >
          <svg viewBox="0 0 20 20" aria-hidden="true" className="size-4">
            <path
              d="M5 7.5 10 12.5 15 7.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {open ? (
          <div className="absolute top-full right-0 left-0 z-30 mt-1 overflow-hidden rounded-xl border border-line bg-card shadow-[0_16px_40px_rgb(0_0_0_/_0.28)]">
            <div className="border-b border-line p-2">
              <input
                ref={searchRef}
                aria-label="Search timezones"
                className="field w-full rounded-lg px-3 py-2"
                value={search}
                placeholder="Search timezones"
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') {
                    setMenu(false);
                  }
                }}
              />
            </div>
            <ul
              id={listId}
              role="listbox"
              aria-label="Timezones"
              className="max-h-52 overflow-y-auto py-1"
            >
              {visible.length === 0 ? (
                <li className="px-3 py-2 text-mist">No matching timezone</li>
              ) : (
                visible.map((zone) => {
                  const selected = zone === value;
                  return (
                    <li key={zone}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        className={
                          selected
                            ? 'block w-full bg-pine-soft px-3 py-2 text-left font-medium text-pine'
                            : 'block w-full px-3 py-2 text-left hover:bg-chip-strong'
                        }
                        onMouseDown={(event) => {
                          event.preventDefault();
                        }}
                        onClick={() => {
                          onChange(zone);
                          setMenu(false);
                        }}
                      >
                        {zone}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
      {error ? (
        <span id={errorId} className="mt-1 block text-clay">
          {error}
        </span>
      ) : null}
    </div>
  );
}
