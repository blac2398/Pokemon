export default function LanguageToggle({ activeLanguage, onChange }) {
  const options = [
    { value: 'jp', label: 'JP' },
    { value: 'en', label: 'EN' },
  ]

  return (
    <div className="flex w-full overflow-hidden rounded-full border border-red-700">
      {options.map((option) => {
        const isActive = activeLanguage === option.value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`w-1/2 px-4 py-2 text-base font-semibold transition-colors ${
              isActive
                ? 'bg-red-700 text-yellow-300'
                : 'bg-white text-red-700 hover:bg-red-50'
            }`}
            aria-pressed={isActive}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
