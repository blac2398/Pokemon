import { useEffect, useMemo, useState } from 'react'
import { upsertSlot } from '../lib/collection'

function formatDexNumber(dexNum) {
  return `#${String(dexNum).padStart(4, '0')}`
}

function confidenceClass(confidence) {
  if (confidence === 'high') {
    return 'bg-green-100 text-green-800'
  }
  if (confidence === 'medium') {
    return 'bg-amber-100 text-amber-800'
  }
  return 'bg-gray-100 text-gray-700'
}

function confidenceLabel(confidence) {
  if (confidence === 'high' || confidence === 'medium' || confidence === 'low') {
    return confidence
  }
  return 'low'
}

function Sprite({ dexNum, name }) {
  const [failed, setFailed] = useState(false)
  const src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexNum}.png`

  if (failed) {
    return (
      <div className="h-14 w-14 rounded bg-gray-200" aria-hidden="true" />
    )
  }

  return (
    <img
      src={src}
      alt={`${name} artwork`}
      loading="lazy"
      className="h-14 w-14 rounded object-contain"
      onError={() => setFailed(true)}
    />
  )
}

function SelectionRow({
  item,
  isSelected,
  onSelect,
  showConfidence,
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`w-full rounded-lg border p-3 text-left transition ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-center gap-3">
        <Sprite dexNum={item.dexNum} name={item.name} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-gray-900">
            {formatDexNumber(item.dexNum)} {item.name}
          </p>
          {showConfidence ? (
            <p className="mt-1 text-xs text-gray-600">{item.reasoning || 'No reasoning provided.'}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          {showConfidence ? (
            <span
              className={`rounded-full px-2 py-1 text-xs font-semibold ${confidenceClass(
                item.confidence,
              )}`}
            >
              {confidenceLabel(item.confidence)}
            </span>
          ) : null}
          <span
            className={`rounded-full px-2 py-1 text-xs font-semibold ${
              item.isOwned
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {item.isOwned ? 'OWNED ↻' : 'NEW'}
          </span>
          <span
            className={`h-5 w-5 rounded-full border-2 ${
              isSelected ? 'border-blue-600 bg-blue-600' : 'border-gray-400'
            }`}
            aria-hidden="true"
          />
        </div>
      </div>
    </button>
  )
}

export default function CandidatePickerModal({
  isOpen,
  photoDataUrl,
  candidates,
  pokedex,
  ownedDexNums,
  scanData,
  language,
  onClose,
  onConfirmSuccess,
}) {
  const [selected, setSelected] = useState(null)
  const [search, setSearch] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const ownedDexSet = useMemo(() => new Set(ownedDexNums), [ownedDexNums])

  useEffect(() => {
    if (!isOpen) {
      return
    }
    setSearch('')
    setSaveError('')
    setIsSaving(false)
    setSelected(candidates[0] ?? null)
  }, [isOpen, candidates])

  const normalizedQuery = search.trim().toLowerCase()
  const manualResults = useMemo(() => {
    if (!normalizedQuery) {
      return []
    }

    return pokedex
      .filter((entry) => entry.name.toLowerCase().includes(normalizedQuery))
      .slice(0, 30)
      .map((entry) => ({
        dexNum: entry.n,
        name: entry.name,
        confidence: 'low',
        reasoning: '',
        isOwned: ownedDexSet.has(entry.n),
      }))
  }, [normalizedQuery, pokedex, ownedDexSet])

  async function handleConfirm() {
    if (!selected || isSaving) {
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      await upsertSlot({
        id: `lang:${language}:${selected.dexNum}`,
        lang: language,
        dexNum: selected.dexNum,
        setHint: scanData?.setHint || '',
        cardNumber: scanData?.cardNumber || '',
        notes: scanData?.notes || '',
        thumbnail: null,
        addedAt: new Date().toISOString(),
      })
      onConfirmSuccess?.()
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
      setIsSaving(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-white text-gray-900">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-lg font-bold">Identify Card</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-2 py-1 text-sm font-semibold text-gray-700"
          >
            Close
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {photoDataUrl ? (
            <img
              src={photoDataUrl}
              alt="Captured Pokemon card"
              className="mx-auto mb-4 max-h-[200px] w-full rounded-lg border border-gray-200 object-contain"
            />
          ) : null}

          {candidates.length ? (
            <section className="space-y-2">
              {candidates.map((candidate) => (
                <SelectionRow
                  key={`candidate-${candidate.dexNum}`}
                  item={candidate}
                  isSelected={selected?.dexNum === candidate.dexNum}
                  onSelect={setSelected}
                  showConfidence={true}
                />
              ))}
            </section>
          ) : (
            <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              Couldn&apos;t auto-identify this card - search manually below
            </p>
          )}

          <section className="mt-5 border-t border-gray-200 pt-4">
            <h3 className="mb-2 text-sm font-semibold text-gray-700">
              None of these? Search manually
            </h3>
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search Pokemon name"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            />
            {manualResults.length ? (
              <div className="mt-3 space-y-2">
                {manualResults.map((entry) => (
                  <SelectionRow
                    key={`manual-${entry.dexNum}`}
                    item={entry}
                    isSelected={selected?.dexNum === entry.dexNum}
                    onSelect={setSelected}
                    showConfidence={false}
                  />
                ))}
              </div>
            ) : normalizedQuery ? (
              <p className="mt-3 text-sm text-gray-500">No Pokemon matched that search.</p>
            ) : null}
          </section>

          <section className="mt-5 space-y-1 text-xs text-gray-500">
            <p>Set: {scanData?.setHint || 'n/a'}</p>
            <p>Card Number: {scanData?.cardNumber || 'n/a'}</p>
            <p>Notes: {scanData?.notes || 'n/a'}</p>
          </section>

          {saveError ? (
            <p className="mt-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {saveError}
            </p>
          ) : null}
        </div>

        <footer className="sticky bottom-0 border-t border-gray-200 bg-white px-4 py-3">
          <p className="mb-3 text-sm text-gray-700">
            {selected
              ? `Selected: ${formatDexNumber(selected.dexNum)} ${selected.name} (${selected.isOwned ? 'already owned - will swap' : `new to ${language.toUpperCase()} collection`})`
              : 'Selected: none'}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 font-semibold text-gray-700"
            >
              CANCEL
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!selected || isSaving}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isSaving ? 'SAVING...' : 'CONFIRM'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  )
}
