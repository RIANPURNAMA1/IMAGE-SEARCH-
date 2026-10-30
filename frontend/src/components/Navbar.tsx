export function Navbar() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4 sm:px-6">
        <a href="/" className="flex items-center gap-2.5 rounded-md text-[15px] font-bold tracking-tight">
          <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true" focusable="false">
            <rect width="32" height="32" rx="6" className="fill-fg" />
            <path
              d="M9 13V9h4M19 9h4v4M23 19v4h-4M13 23H9v-4"
              className="stroke-bg"
              strokeWidth="2"
              fill="none"
            />
          </svg>
          Image Source Finder
        </a>
      </div>
    </header>
  );
}
