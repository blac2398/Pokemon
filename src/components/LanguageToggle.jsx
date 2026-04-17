export default function LanguageToggle({ activeLanguage, onChange }) {
  const options = [
    { value: 'jp', label: 'JP' },
    { value: 'en', label: 'EN' },
  ]

  return (
    <div className="flex justify-center">
      <div className="inline-flex rounded-full bg-pokedex-cream-dark/60 p-1">
      {options.map((option) => {
        const isActive = activeLanguage === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 font-display text-xs uppercase tracking-wider transition-colors ${
              isActive
                ? 'bg-pokedex-charcoal text-pokedex-cream'
                : 'text-pokedex-charcoal/60'
            }`}
            aria-pressed={isActive}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                isActive
                  ? 'bg-pokedex-led shadow-[0_0_4px_rgba(74,222,128,0.8)]'
                  : 'bg-pokedex-charcoal/20'
              }`}
              aria-hidden="true"
            />
            {option.label}
          </button>
        )
      })}
      </div>
    </div>
  )
}
