interface AdminTopbarProps {
  title: string;
}

export function AdminTopbar({ title }: AdminTopbarProps) {
  const today = new Intl.DateTimeFormat("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date());

  return (
    <header className="flex items-center gap-4 border-b border-neutral-200 bg-white px-7 py-4">
      <div>
        <h1 className="font-display text-lg font-semibold text-neutral-900">{title}</h1>
        <p className="text-xs text-neutral-500">{today}</p>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-sm text-neutral-400">
          <SearchIcon />
          <span>Search coming soon</span>
        </div>
        <button
          type="button"
          disabled
          title="Notifications coming soon"
          aria-label="Notifications"
          className="rounded-md border border-neutral-200 p-2 text-neutral-400 disabled:cursor-default disabled:opacity-60"
        >
          <BellIcon />
        </button>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-[15px] w-[15px]" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4" aria-hidden="true">
      <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.7 21a2 2 0 0 1-3.4 0" />
    </svg>
  );
}
