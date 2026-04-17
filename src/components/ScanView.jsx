import { useRef, useState } from 'react'
import { getAllPokedex, getSlot, getSlots } from '../lib/collection'
import { identifyCard } from '../lib/api'
import { resizeImage } from '../lib/image'
import CandidatePickerModal from './CandidatePickerModal'

const SCAN_STATE = {
  IDLE: 'idle',
  READING: 'reading',
  IDENTIFYING: 'identifying',
  DONE: 'done',
}

function toBase64(dataUrl) {
  return dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
}

export default function ScanView({ activeLanguage, onCollectionChanged }) {
  const fileInputRef = useRef(null)
  const [scanState, setScanState] = useState(SCAN_STATE.IDLE)
  const [errorMessage, setErrorMessage] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState('')
  const [confirmData, setConfirmData] = useState(null)

  function triggerCapture() {
    fileInputRef.current?.click()
  }

  function resetToIdle() {
    setScanState(SCAN_STATE.IDLE)
    setErrorMessage('')
    setCapturedPhoto('')
    setConfirmData(null)
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) {
      return
    }

    setErrorMessage('')
    setConfirmData(null)
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
      const pokedex = await getAllPokedex()
      const pokedexByName = new Map(
        pokedex.map((entry) => [entry.name.toLowerCase(), entry]),
      )
      const enrichedCandidates = []
      const seenDexNums = new Set()

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
        const existingSlot = await getSlot(activeLanguage, matchedEntry.n)
        enrichedCandidates.push({
          dexNum: matchedEntry.n,
          name: matchedEntry.name,
          confidence: candidate.confidence,
          reasoning: candidate.reasoning,
          isOwned: Boolean(existingSlot),
        })
      }

      const ownedSlots = await getSlots(activeLanguage)

      setConfirmData({
        candidates: enrichedCandidates,
        pokedex,
        ownedDexNums: ownedSlots.map((slot) => slot.dexNum),
        scanData: {
          setHint: identified.setHint,
          cardNumber: identified.cardNumber,
          notes: identified.notes,
        },
      })
      setScanState(SCAN_STATE.DONE)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setScanState(SCAN_STATE.DONE)
    }
  }

  function handleConfirmSuccess() {
    onCollectionChanged?.()
    resetToIdle()
  }

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

      {scanState === SCAN_STATE.DONE && errorMessage ? (
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

      <CandidatePickerModal
        isOpen={Boolean(confirmData)}
        language={activeLanguage}
        photoDataUrl={capturedPhoto}
        candidates={confirmData?.candidates ?? []}
        pokedex={confirmData?.pokedex ?? []}
        ownedDexNums={confirmData?.ownedDexNums ?? []}
        scanData={confirmData?.scanData ?? {}}
        onClose={resetToIdle}
        onConfirmSuccess={handleConfirmSuccess}
      />
    </section>
  )
}
