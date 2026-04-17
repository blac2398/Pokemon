export default function FilterBar({
  searchTerm,
  onSearchChange,
  activeFilter,
  onFilterChange,
}) {
  const filters = ['all', 'owned', 'missing']

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
        <span className="text-gray-500" aria-hidden="true">
          🔍
        </span>
        <input
          type="text"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search by name or dex number"
          className="w-full border-none bg-transparent text-sm outline-none"
        />
      </label>

      <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-gray-300 bg-white">
        {filters.map((filter) => {
          const isActive = activeFilter === filter
          return (
            <button
              key={filter}
              type="button"
              onClick={() => onFilterChange(filter)}
              className={`px-3 py-2 text-sm font-semibold uppercase tracking-wide transition-colors ${
                isActive
                  ? 'bg-red-700 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
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
