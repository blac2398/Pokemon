export default function FilterBar({
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
}) {
  const filters = ['all', 'owned', 'missing']

  return (
    <div className="space-y-3">
      <label className="relative block">
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pokedex-charcoal/40"
          aria-hidden="true"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="h-4 w-4"
          >
            <circle cx="11" cy="11" r="7" />
            <line x1="16.65" y1="16.65" x2="21" y2="21" />
          </svg>
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or dex number..."
          className="w-full rounded-lg border-2 border-pokedex-cream-dark bg-pokedex-cream py-2.5 pl-10 pr-4 font-body text-pokedex-charcoal shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] outline-none placeholder:text-pokedex-charcoal/40 focus:border-pokedex-red focus:ring-2 focus:ring-pokedex-red/20"
        />
      </label>

      <div className="flex w-full rounded-full bg-pokedex-cream-dark/60 p-1">
        {filters.map((filter) => {
          const isActive = activeFilter === filter
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`flex-1 rounded-full py-2 text-center font-display text-xs uppercase tracking-wider transition-colors ${
                isActive
                  ? 'bg-pokedex-red text-pokedex-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.15)]'
                  : 'text-pokedex-charcoal/60'
              }`}
              aria-pressed={isActive}
            >
              {filter}
            </button>
          )
        })}
      </div>
    </div>
  )
}
