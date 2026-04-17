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
  const chevron = isOwned ? '›' : ''

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
      className={`flex w-full items-center gap-3 border-b border-gray-200 px-3 py-2 text-left transition-colors ${
        isOwned ? 'bg-yellow-50 hover:bg-yellow-100' : 'bg-white hover:bg-gray-50'
      }`}
    >
      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded bg-gray-100">
        {imageFailed ? (
          <div className="flex h-full w-full items-center justify-center bg-gray-200 text-xs font-semibold text-gray-600">
            {dexLabel}
          </div>
        ) : (
          <img
            src={spriteUrl(entry.n)}
            alt={entry.name}
            loading="lazy"
            className="h-14 w-14 object-contain"
            onError={() => setImageFailed(true)}
          />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="font-mono text-xs text-gray-500">{dexLabel}</p>
        <p className="truncate text-base text-gray-900">{entry.name}</p>
      </div>

      <div className="flex w-10 shrink-0 items-center justify-end gap-1 text-xl text-yellow-500">
        <span>{isOwned ? '✓' : ''}</span>
        <span className="text-gray-400">{chevron}</span>
      </div>
    </button>
  )
}
