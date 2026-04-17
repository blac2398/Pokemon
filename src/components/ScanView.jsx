import { useEffect, useMemo, useRef, useState } from 'react'
import { getAllPokedex, getSlots, upsertSlot } from '../lib/collection'
import { identifyCard } from '../lib/api'
import { resizeImage } from '../lib/image'

const SCAN_STATE = {
  IDLE: 'idle',
  READING: 'reading',
  IDENTIFYING: 'identifying',
  RESULTS: 'results',
}

function toBase64(dataUrl) {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
}

function formatDexNumber(dexNum) {
  return `#${String(dexNum).padStart(4, '0')}`
}

function confidenceDotClass(confidence) {
  if (confidence === 'high') {
    return 'bg-green-500'
  }
  if (confidence === 'medium') {
    return 'bg-amber-500'
  }
  return 'bg-gray-400'
}

function spriteUrlForDex(dexNum) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexNum}.png`
}

export default function ScanView({ activeLanguage, onCollectionChanged }) {
  const captureInputRef = useRef(null)
  const libraryInputRef = useRef(null)
  const [scanState, setScanState] = useState(SCAN_STATE.IDLE)
  const [errorMessage, setErrorMessage] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState('')
  const [confirmData, setConfirmData] = useState(null)
  const [pokedex, setPokedex] = useState([])
  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [identifyDotCount, setIdentifyDotCount] = useState(1)

  useEffect(() => {
    let mounted = true

    async function loadPokedex() {
      try {
        const allPokedex = await getAllPokedex()
        if (mounted) {
          setPokedex(allPokedex)
        }
      } catch (error) {
        if (mounted) {
          setErrorMessage(error instanceof Error ? error.message : String(error))
        }
      }
    }

    loadPokedex()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (scanState !== SCAN_STATE.IDENTIFYING) {
      setIdentifyDotCount(1)
      return
    }

    const intervalId = window.setInterval(() => {
      setIdentifyDotCount((count) => (count >= 3 ? 1 : count + 1))
    }, 400)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [scanState])

  function triggerCapture() {
    captureInputRef.current?.click()
  }

  function triggerLibraryPick() {
    libraryInputRef.current?.click()
  }

  function resetToIdle() {
    setScanState(SCAN_STATE.IDLE)
    setErrorMessage('')
    setCapturedPhoto('')
    setConfirmData(null)
    setSelectedCandidate(null)
    setSearchExpanded(false)
    setSearchQuery('')
    setIsSaving(false)
    setSaveError('')
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setErrorMessage('')
    setConfirmData(null)
    setSelectedCandidate(null)
    setSearchExpanded(false)
    setSearchQuery('')
    setSaveError('')
    setScanState(SCAN_STATE.READING)

    try {
      const { dataUrl, mediaType } = await resizeImage(file)
      setCapturedPhoto(dataUrl)
      setScanState(SCAN_STATE.IDENTIFYING)

      const identified = await identifyCard(
        toBase64(dataUrl),
        mediaType,
        activeLanguage,
      )
      const allPokedex = pokedex.length ? pokedex : await getAllPokedex()
      const pokedexByName = new Map(
        allPokedex.map((entry) => [entry.name.toLowerCase(), entry]),
      )
      const enrichedCandidates = []
      const seenDexNums = new Set()
      const ownedSlots = await getSlots(activeLanguage)
      const ownedDexSet = new Set(ownedSlots.map((slot) => slot.dexNum))

      // We only keep candidates that map to a real National Dex entry.
      for (const candidate of identified.candidates) {
        const matchedEntry = pokedexByName.get(candidate.name.toLowerCase())
        if (!matchedEntry) {
          continue
        }
        if (seenDexNums.has(matchedEntry.n)) {
          continue
        }
        seenDexNums.add(matchedEntry.n)
        enrichedCandidates.push({
          dexNum: matchedEntry.n,
          name: matchedEntry.name,
          confidence: candidate.confidence,
          reasoning: candidate.reasoning,
          isOwned: ownedDexSet.has(matchedEntry.n),
        })
      }

      setConfirmData({
        candidates: enrichedCandidates,
        ownedDexNums: Array.from(ownedDexSet),
        scanData: {
          setHint: identified.setHint,
          cardNumber: identified.cardNumber,
          notes: identified.notes,
        },
      })
      setSelectedCandidate(enrichedCandidates[0] ?? null)
      setSearchExpanded(enrichedCandidates.length === 0)
      setScanState(SCAN_STATE.RESULTS)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setScanState(SCAN_STATE.RESULTS)
    }
  }

  async function handleConfirm() {
    if (!selectedCandidate || isSaving) {
      return
    }

    setIsSaving(true)
    setSaveError('')

    try {
      await upsertSlot({
        id: `lang:${activeLanguage}:${selectedCandidate.dexNum}`,
        lang: activeLanguage,
        dexNum: selectedCandidate.dexNum,
        setHint: confirmData?.scanData?.setHint || '',
        cardNumber: confirmData?.scanData?.cardNumber || '',
        notes: confirmData?.scanData?.notes || '',
        thumbnail: null,
        addedAt: new Date().toISOString(),
      })
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error))
      setIsSaving(false)
      return
    }

    onCollectionChanged?.()
    resetToIdle()
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const manualResults = useMemo(() => {
    if (!normalizedQuery || !confirmData) {
      return []
    }

    const ownedDexSet = new Set(confirmData.ownedDexNums)
    return pokedex
      .filter((entry) => {
        const normalizedDex = String(entry.n)
        return (
          entry.name.toLowerCase().includes(normalizedQuery) ||
          normalizedDex.includes(normalizedQuery)
        )
      })
      .slice(0, 50)
      .map((entry) => ({
        dexNum: entry.n,
        name: entry.name,
        confidence: 'low',
        isOwned: ownedDexSet.has(entry.n),
      }))
  }, [normalizedQuery, pokedex, confirmData])

  return (
    <section className="rounded-xl border border-pokedex-red-dark/50 bg-pokedex-cream-dark/50 p-5 text-pokedex-charcoal shadow-sm">
      <input
        ref={captureInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {scanState === SCAN_STATE.IDLE ? (
        <div className="flex min-h-[460px] flex-col items-center justify-center gap-5 py-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-pokedex-lcd px-3 py-1.5 font-mono text-[11px] uppercase tracking-widest text-pokedex-lcd-dark shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-pokedex-led shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
            <span>SCAN READY</span>
          </div>
          <button
            type="button"
            onClick={triggerCapture}
            className="flex h-32 w-32 items-center justify-center rounded-full ring-4 ring-pokedex-cream ring-offset-4 ring-offset-transparent shadow-lg transition-transform duration-100 active:scale-95"
            style={{
              background:
                'radial-gradient(circle at 30% 30%, #d84a62, #9e1730)',
              boxShadow:
                'inset 0 -4px 8px rgba(0,0,0,0.25), inset 0 4px 4px rgba(255,255,255,0.15)',
            }}
            aria-label="Capture card"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-10 w-10 text-pokedex-cream"
              aria-hidden="true"
            >
              <path d="M4 7h3l2-2h6l2 2h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
          </button>
          <p className="text-sm font-body text-pokedex-charcoal/70">Tap to capture a card</p>
          <button
            type="button"
            onClick={triggerLibraryPick}
            className="text-sm font-body text-pokedex-charcoal/60 underline decoration-pokedex-charcoal/30 underline-offset-4 transition hover:text-pokedex-charcoal"
          >
            or choose from library
          </button>
          <p className="text-xs font-mono uppercase tracking-wider text-pokedex-charcoal/50">
            {activeLanguage.toUpperCase()} mode
          </p>
        </div>
      ) : null}

      {scanState === SCAN_STATE.READING ? (
        <div className="space-y-4 py-10 text-center">
          <p className="inline-flex items-center rounded-md bg-pokedex-lcd px-3 py-2 font-mono text-sm uppercase tracking-widest text-pokedex-lcd-dark shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
            PREPARING IMAGE...
          </p>
        </div>
      ) : null}

      {scanState === SCAN_STATE.IDENTIFYING ? (
        <div className="space-y-5">
          {capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Captured Pokemon card"
              className="mx-auto max-h-[60vh] w-full rounded-lg border-2 border-pokedex-cream-dark object-contain shadow-lg"
            />
          ) : null}
          <div className="flex justify-center">
            <p className="inline-flex min-w-[200px] items-center justify-center rounded-md bg-pokedex-lcd px-3 py-2 font-mono text-sm uppercase tracking-widest text-pokedex-lcd-dark shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
              IDENTIFYING{'.'.repeat(identifyDotCount)}
            </p>
          </div>
        </div>
      ) : null}

      {scanState === SCAN_STATE.RESULTS && errorMessage ? (
        <div className="space-y-4 py-6">
          {capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Captured Pokemon card"
              className="mx-auto max-h-[45vh] w-full rounded-lg border border-gray-700 object-contain"
            />
          ) : null}
          <p className="rounded-lg border border-pokedex-red-dark bg-pokedex-red-dark/20 p-3 text-sm text-pokedex-red-dark">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={triggerCapture}
            className="w-full rounded-md bg-pokedex-red px-4 py-3 font-display tracking-wider text-pokedex-cream transition hover:bg-pokedex-red-light"
          >
            Try Again
          </button>
        </div>
      ) : null}

      {scanState === SCAN_STATE.RESULTS && confirmData && !errorMessage ? (
        <div className="space-y-5 pt-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Captured Pokemon card"
                className="w-full rounded-lg border-2 border-pokedex-cream-dark object-contain shadow-md max-h-[180px] sm:max-h-[220px] sm:w-[260px] sm:flex-none"
              />
            ) : null}
            <div className="min-w-0 flex-1 rounded-md border border-pokedex-cream-dark/70 bg-pokedex-cream p-3 font-mono text-xs text-pokedex-charcoal shadow-sm">
              <p className="truncate">
                <span className="text-pokedex-charcoal/60">SET:</span>{' '}
                {confirmData.scanData?.setHint || '—'}
              </p>
              <p className="truncate">
                <span className="text-pokedex-charcoal/60">NO:</span>{' '}
                {confirmData.scanData?.cardNumber || '—'}
              </p>
              <p className="truncate" title={confirmData.scanData?.notes || '—'}>
                <span className="text-pokedex-charcoal/60">NOTES:</span>{' '}
                {confirmData.scanData?.notes || '—'}
              </p>
            </div>
          </div>

          {confirmData.candidates.length === 0 ? (
            <p className="text-sm font-body text-pokedex-charcoal/60">
              Couldn&apos;t identify - search manually
            </p>
          ) : null}

          {confirmData.candidates.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Top candidate matches">
              {confirmData.candidates.map((candidate) => {
                const isSelected = selectedCandidate?.dexNum === candidate.dexNum
                const confidenceIsHigh = candidate.confidence === 'high'
                const confidenceIsMedium = candidate.confidence === 'medium'
                return (
                  <button
                    key={`candidate-${candidate.dexNum}`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`relative min-h-[180px] rounded-xl border-2 p-4 text-left transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red ${
                      isSelected
                        ? 'translate-y-[-4px] border-pokedex-red bg-gradient-to-b from-pokedex-cream to-white shadow-lg'
                        : 'border-pokedex-cream-dark bg-pokedex-cream shadow-sm hover:border-pokedex-red-dark/40'
                    }`}
                  >
                    <div className="absolute left-2 top-2 inline-flex items-center gap-1.5">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          confidenceIsHigh
                            ? 'bg-pokedex-led shadow-[0_0_6px_rgba(74,222,128,0.8)]'
                            : confidenceIsMedium
                              ? 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]'
                              : 'bg-gray-400'
                        }`}
                        aria-hidden="true"
                      />
                      <span
                        className={`font-mono text-[10px] uppercase tracking-wider ${
                          confidenceIsHigh
                            ? 'text-pokedex-lcd-dark/80'
                            : confidenceIsMedium
                              ? 'text-amber-700'
                              : 'text-pokedex-charcoal/50'
                        }`}
                      >
                        {confidenceIsHigh ? 'HIGH' : confidenceIsMedium ? 'MED' : 'LOW'}
                      </span>
                    </div>
                    <span
                      className={`absolute right-2 top-2 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                        candidate.isOwned
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {candidate.isOwned ? 'OWNED' : 'NEW'}
                    </span>
                    <div className="mt-7 flex justify-center">
                      <img
                        src={spriteUrlForDex(candidate.dexNum)}
                        alt={`${candidate.name} artwork`}
                        loading="lazy"
                        className="h-24 w-24 object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                          if (event.currentTarget.nextSibling) {
                            event.currentTarget.nextSibling.style.display = 'flex'
                          }
                        }}
                      />
                      <div
                        className="hidden h-24 w-24 items-center justify-center rounded bg-pokedex-cream-dark/70 font-mono text-xs text-pokedex-charcoal/60"
                        aria-hidden="true"
                      >
                        {formatDexNumber(candidate.dexNum)}
                      </div>
                    </div>
                    <p className="mt-2 text-center font-mono text-xs text-pokedex-charcoal/60">
                      {formatDexNumber(candidate.dexNum)}
                    </p>
                    <p className="text-center font-body text-base font-bold text-pokedex-charcoal">
                      {candidate.name}
                    </p>
                    {isSelected ? (
                      <span className="absolute bottom-2 right-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-pokedex-red text-xs text-pokedex-cream">
                        ✓
                      </span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="rounded-md bg-pokedex-cream-dark/30 p-2 font-body text-sm text-pokedex-charcoal">
            <button
              type="button"
              onClick={() => setSearchExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red"
            >
              <span className="inline-flex items-center gap-2">
                <span
                  className={`inline-block transform text-xs transition-transform ${
                    searchExpanded ? 'rotate-90' : ''
                  }`}
                  aria-hidden="true"
                >
                  ▸
                </span>
                None of these? Search manually
              </span>
            </button>
            {searchExpanded ? (
              <div className="space-y-2 border-t border-pokedex-cream-dark/60 pt-2">
                <label className="relative block">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-pokedex-charcoal/50">
                    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" aria-hidden="true">
                      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
                      <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" />
                    </svg>
                  </span>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search name or dex number"
                    className="w-full rounded-md border border-pokedex-cream-dark bg-white py-2 pl-9 pr-3 font-body text-sm text-pokedex-charcoal focus:border-pokedex-red focus:outline-none focus:ring-2 focus:ring-pokedex-red/20"
                  />
                </label>
                <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                  {manualResults.map((entry) => (
                    <button
                      key={`manual-${entry.dexNum}`}
                      type="button"
                      onClick={() => {
                        setSelectedCandidate(entry)
                        setSearchExpanded(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-md border border-pokedex-cream-dark/70 bg-pokedex-cream px-2 py-2 text-left transition hover:border-pokedex-red-dark/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red"
                    >
                      <img
                        src={spriteUrlForDex(entry.dexNum)}
                        alt={`${entry.name} artwork`}
                        loading="lazy"
                        className="h-10 w-10 rounded object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                          if (event.currentTarget.nextSibling) {
                            event.currentTarget.nextSibling.style.display = 'flex'
                          }
                        }}
                      />
                      <div
                        className="hidden h-10 w-10 items-center justify-center rounded bg-pokedex-cream-dark/70 font-mono text-[10px] text-pokedex-charcoal/60"
                        aria-hidden="true"
                      >
                        {entry.dexNum}
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm">
                        <span className="mr-2 font-mono text-xs text-pokedex-charcoal/60">
                          {formatDexNumber(entry.dexNum)}
                        </span>
                        <span className="font-body font-semibold text-pokedex-charcoal">{entry.name}</span>
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                          entry.isOwned
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {entry.isOwned ? 'OWNED' : 'NEW'}
                      </span>
                    </button>
                  ))}
                  {normalizedQuery && !manualResults.length ? (
                    <p className="text-sm text-pokedex-charcoal/60">No Pokemon matched that search.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {saveError ? (
            <p className="rounded-lg border border-pokedex-red-dark bg-pokedex-red-dark/10 p-2 text-sm text-pokedex-red-dark">
              {saveError}
            </p>
          ) : null}

          <div className="sticky bottom-0 border-t border-pokedex-red bg-gradient-to-b from-pokedex-charcoal to-pokedex-charcoal/95 px-5 py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 rounded-md bg-pokedex-lcd px-3 py-2 font-mono text-pokedex-lcd-dark shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
                <p className="truncate text-xs uppercase tracking-widest text-pokedex-lcd-dark/70">
                  {selectedCandidate ? 'SELECTED' : 'NO SELECTION'}
                </p>
                <p className="truncate text-sm font-bold uppercase">
                  {selectedCandidate
                    ? `${formatDexNumber(selectedCandidate.dexNum)} ${selectedCandidate.name}`
                    : '—'}
                </p>
                <p className="truncate text-xs text-pokedex-lcd-dark/80">
                  {selectedCandidate
                    ? selectedCandidate.isOwned
                      ? '-> already owned • will swap in'
                      : `-> new to ${activeLanguage.toUpperCase()} collection`
                    : '—'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetToIdle}
                  className="rounded-md border border-pokedex-cream bg-transparent px-5 py-2.5 font-display text-sm uppercase tracking-wider text-pokedex-cream transition hover:bg-pokedex-cream/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-cream/60"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!selectedCandidate || isSaving}
                  className="rounded-md bg-pokedex-red px-5 py-2.5 font-display text-sm uppercase tracking-wider text-pokedex-cream transition hover:bg-pokedex-red-light focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isSaving ? 'SAVING...' : 'CONFIRM'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
