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
  const fileInputRef = useRef(null)
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

  function triggerCapture() {
    fileInputRef.current?.click()
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
    <section className="rounded-xl border border-gray-700 bg-gray-900 p-4 text-white shadow-sm">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {scanState === SCAN_STATE.IDLE ? (
        <div className="flex flex-col items-center gap-4 py-8">
          <p className="text-sm text-gray-300">
            Capture a Pokemon card in {activeLanguage.toUpperCase()} collection mode.
          </p>
          <button
            type="button"
            onClick={triggerCapture}
            className="rounded-full bg-blue-500 px-10 py-5 text-xl font-bold tracking-wide text-white shadow-lg transition hover:bg-blue-400"
          >
            Capture Card
          </button>
        </div>
      ) : null}

      {scanState === SCAN_STATE.READING ? (
        <div className="py-10 text-center">
          <p className="text-base font-semibold">Preparing image...</p>
        </div>
      ) : null}

      {scanState === SCAN_STATE.IDENTIFYING ? (
        <div className="space-y-4">
          {capturedPhoto ? (
            <img
              src={capturedPhoto}
              alt="Captured Pokemon card"
              className="mx-auto max-h-[60vh] w-full rounded-lg border border-gray-700 object-contain"
            />
          ) : null}
          <div className="text-center">
            <p className="inline-flex items-center gap-2 rounded-md bg-gray-800 px-3 py-2 text-sm font-semibold text-gray-100">
              <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-400" />
              Identifying...
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
          <p className="rounded-lg border border-red-700 bg-red-950/60 p-3 text-sm text-red-200">
            {errorMessage}
          </p>
          <button
            type="button"
            onClick={triggerCapture}
            className="w-full rounded-md bg-blue-500 px-4 py-3 font-semibold text-white hover:bg-blue-400"
          >
            Try Again
          </button>
        </div>
      ) : null}

      {scanState === SCAN_STATE.RESULTS && confirmData && !errorMessage ? (
        <div className="space-y-4 pt-2 text-gray-900">
          <div className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-3 sm:flex-row sm:items-start">
            {capturedPhoto ? (
              <img
                src={capturedPhoto}
                alt="Captured Pokemon card"
                className="w-full rounded-lg border border-gray-200 object-contain shadow-sm max-h-[180px] sm:max-h-[220px] sm:w-[260px] sm:flex-none"
              />
            ) : null}
            <div className="min-w-0 flex-1 self-center text-xs text-gray-600 sm:self-center">
              <p className="truncate">
                SET: {confirmData.scanData?.setHint || '—'} · NO:{' '}
                {confirmData.scanData?.cardNumber || '—'} · NOTES:{' '}
                {confirmData.scanData?.notes || '—'}
              </p>
            </div>
          </div>

          {confirmData.candidates.length === 0 ? (
            <p className="text-sm text-gray-500">Couldn&apos;t identify - search manually</p>
          ) : null}

          {confirmData.candidates.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Top candidate matches">
              {confirmData.candidates.map((candidate) => {
                const isSelected = selectedCandidate?.dexNum === candidate.dexNum
                return (
                  <button
                    key={`candidate-${candidate.dexNum}`}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedCandidate(candidate)}
                    className={`relative rounded-xl border bg-white p-3 text-left shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 ${
                      isSelected
                        ? 'translate-y-[-2px] border-2 border-red-600 bg-red-50/40 shadow-md'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute left-2 top-2 h-2 w-2 rounded-full ring-2 ring-white ${confidenceDotClass(candidate.confidence)}`}
                      aria-hidden="true"
                    />
                    <span
                      className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        candidate.isOwned
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {candidate.isOwned ? 'OWNED' : 'NEW'}
                    </span>
                    <div className="mt-3 flex justify-center">
                      <img
                        src={spriteUrlForDex(candidate.dexNum)}
                        alt={`${candidate.name} artwork`}
                        loading="lazy"
                        className="h-[100px] w-[100px] object-contain"
                        onError={(event) => {
                          event.currentTarget.style.display = 'none'
                          if (event.currentTarget.nextSibling) {
                            event.currentTarget.nextSibling.style.display = 'flex'
                          }
                        }}
                      />
                      <div
                        className="hidden h-[100px] w-[100px] items-center justify-center rounded bg-gray-200 text-xs font-semibold text-gray-500"
                        aria-hidden="true"
                      >
                        {formatDexNumber(candidate.dexNum)}
                      </div>
                    </div>
                    <p className="mt-2 text-center font-mono text-xs text-gray-500">
                      {formatDexNumber(candidate.dexNum)}
                    </p>
                    <p className="text-center text-base font-bold text-gray-900">{candidate.name}</p>
                  </button>
                )
              })}
            </div>
          ) : null}

          <div className="rounded-lg border border-gray-200 bg-white">
            <button
              type="button"
              onClick={() => setSearchExpanded((prev) => !prev)}
              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm font-medium text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <span>{searchExpanded ? '▾' : '▸'} None of these? Search manually</span>
            </button>
            {searchExpanded ? (
              <div className="space-y-2 border-t border-gray-200 p-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search name or dex number"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30"
                />
                <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
                  {manualResults.map((entry) => (
                    <button
                      key={`manual-${entry.dexNum}`}
                      type="button"
                      onClick={() => {
                        setSelectedCandidate(entry)
                        setSearchExpanded(false)
                      }}
                      className="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-2 py-2 text-left hover:border-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
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
                        className="hidden h-10 w-10 items-center justify-center rounded bg-gray-200 text-[10px] font-semibold text-gray-500"
                        aria-hidden="true"
                      >
                        {entry.dexNum}
                      </div>
                      <p className="min-w-0 flex-1 truncate text-sm">
                        <span className="mr-2 font-mono text-xs text-gray-500">
                          {formatDexNumber(entry.dexNum)}
                        </span>
                        <span className="font-semibold text-gray-900">{entry.name}</span>
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
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
                    <p className="text-sm text-gray-500">No Pokemon matched that search.</p>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {saveError ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {saveError}
            </p>
          ) : null}

          <div className="sticky bottom-0 border-t border-gray-200 bg-white/95 px-3 py-3 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate text-sm text-gray-800">
                  <span className="font-semibold">Selected:</span>{' '}
                  {selectedCandidate
                    ? `${formatDexNumber(selectedCandidate.dexNum)} ${selectedCandidate.name}`
                    : 'none'}
                </p>
                <p className="text-xs text-gray-600">
                  {selectedCandidate
                    ? selectedCandidate.isOwned
                      ? '-> already owned, will swap'
                      : `-> new to ${activeLanguage.toUpperCase()} collection`
                    : '-> nothing selected'}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetToIdle}
                  className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
                >
                  CANCEL
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={!selectedCandidate || isSaving}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:bg-red-300"
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
