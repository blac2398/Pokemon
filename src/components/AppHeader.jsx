function AppHeader({ onOpenSettings, title = 'POKEDEX' }) {
  return (
    <header className="bg-gradient-to-b from-pokedex-red to-pokedex-red-dark px-5 pt-[env(safe-area-inset-top)] text-pokedex-cream shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]">
      <div className="mx-auto flex h-[72px] max-w-[720px] items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 animate-led-pulse rounded-full bg-pokedex-led shadow-[0_0_8px_rgba(74,222,128,0.8)]"
          />
          <h1 className="font-display text-2xl font-black uppercase tracking-[0.08em] drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
            {title}
          </h1>
        </div>
        <button
          type="button"
          onClick={onOpenSettings}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-pokedex-red-dark ring-1 ring-inset ring-black/20 transition active:scale-95"
          aria-label="Open settings"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-5 w-5 text-pokedex-cream"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.65 1.65 0 0 0 15 19.4a1.65 1.65 0 0 0-1 .6 1.65 1.65 0 0 0-.33 1V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-.33-1 1.65 1.65 0 0 0-1-.6 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-.6-1 1.65 1.65 0 0 0-1-.33H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1-.33 1.65 1.65 0 0 0 .6-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-.6 1.65 1.65 0 0 0 .33-1V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 .33 1 1.65 1.65 0 0 0 1 .6 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.23.31.38.67.43 1.05.05.38 0 .77-.13 1.12-.13.36-.33.68-.6.94a1.65 1.65 0 0 0-.5 1.89z" />
          </svg>
        </button>
      </div>
    </header>
  )
}

export default AppHeader
