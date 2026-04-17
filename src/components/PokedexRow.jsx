import { useState } from 'react'

function formatDexNumber(dexNum) {
  return `#${String(dexNum).padStart(4, '0')}`
}

function spriteUrl(dexNum) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexNum}.png`
}

export default function PokedexRow({ entry, isOwned, onToggle, onOpenDetail }) {
  const [imageFailed, setImageFailed] = useState(false)
  const dexLabel = formatDexNumber(entry.n)

  function handleClick() {
    if (isOwned) {
      onOpenDetail?.(entry)
      return
    }

    onToggle?.()
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-4 py-3 text-left transition-colors active:scale-[0.99] active:transition-transform active:duration-75 ${
        isOwned
          ? 'border-pokedex-cream-dark/70 bg-pokedex-cream hover:bg-pokedex-cream-dark/20'
          : 'border-pokedex-cream-dark/40 bg-white hover:bg-pokedex-cream-dark/10'
      }`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-pokedex-cream-dark/20">
        {imageFailed ? (
          <div className="flex h-full w-full items-center justify-center bg-pokedex-cream-dark/40 text-xs font-semibold text-pokedex-charcoal/70">
            {dexLabel}
          </div>
        ) : (
          <img
            src={spriteUrl(entry.n)}
            alt={entry.name}
            loading="lazy"
            className="h-full w-full object-contain"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs tracking-wide text-pokedex-lcd-dark/70">
          {dexLabel}
        </p>
        <p className="truncate font-body text-base font-semibold text-pokedex-charcoal">
          {entry.name}
        </p>
      </div>

      {isOwned ? (
        <div className="ml-2 flex shrink-0 items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-pokedex-red">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              className="h-3.5 w-3.5 text-white"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </span>
          <span className="text-sm text-pokedex-charcoal/30" aria-hidden="true">
            ›
          </span>
        </div>
      ) : null}
    </button>
  )
}
