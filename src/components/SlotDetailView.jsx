import { useEffect, useRef, useState } from 'react'
import { deleteSlot, upsertSlot } from '../lib/collection'
import { resizeImageForStorage } from '../lib/image'

function spriteUrl(dexNum) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${dexNum}.png`
}

function formatDexNumber(dexNum) {
  return `#${String(dexNum).padStart(4, '0')}`
}

function formatAddedDate(addedAt) {
  if (!addedAt) {
    return '-'
  }

  const date = new Date(addedAt)
  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return date.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function toInputModel(slot) {
  return {
    setHint: slot?.setHint ?? '',
    cardNumber: slot?.cardNumber ?? '',
    notes: slot?.notes ?? '',
  }
}

export default function SlotDetailView({
  slot,
  pokedexEntry,
  lang,
  onClose,
  onChange,
}) {
  const fileInputRef = useRef(null)
  const [isEditing, setIsEditing] = useState(false)
  const [pendingRemoval, setPendingRemoval] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [formValues, setFormValues] = useState(toInputModel(slot))

  useEffect(() => {
    setFormValues(toInputModel(slot))
    setIsEditing(false)
    setPendingRemoval(false)
    setErrorMessage('')
  }, [slot])

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  function handleFieldChange(fieldName, value) {
    setFormValues((current) => ({ ...current, [fieldName]: value }))
  }

  async function handleSave() {
    if (!slot || isSaving) {
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    try {
      await upsertSlot({
        ...slot,
        setHint: formValues.setHint.trim(),
        cardNumber: formValues.cardNumber.trim(),
        notes: formValues.notes.trim(),
      })
      setIsEditing(false)
      onChange?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsSaving(false)
    }
  }

  function handleCancelEdit() {
    setFormValues(toInputModel(slot))
    setIsEditing(false)
  }

  function triggerCapture() {
    fileInputRef.current?.click()
  }

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file || !slot || isSaving) {
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    try {
      const { dataUrl } = await resizeImageForStorage(file, 400, 0.8)
      await upsertSlot({
        ...slot,
        thumbnail: dataUrl,
      })
      onChange?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsSaving(false)
    }
  }

  async function handleConfirmRemove() {
    if (!slot || isSaving) {
      return
    }

    setIsSaving(true)
    setErrorMessage('')
    try {
      await deleteSlot(lang, pokedexEntry.n)
      onChange?.()
      onClose?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setIsSaving(false)
    }
  }

  const imageSource = slot?.thumbnail || spriteUrl(pokedexEntry.n)
  const hasThumbnail = Boolean(slot?.thumbnail)
  const rowValueClass = 'font-body text-sm text-pokedex-charcoal'
  const actionButtonClass =
    'inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-display uppercase tracking-wider transition-all duration-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red/30 disabled:cursor-not-allowed disabled:opacity-60'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 backdrop-blur-sm transition-opacity duration-200 md:p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex h-full w-full scale-100 flex-col bg-pokedex-cream transition-transform duration-200 md:h-[90vh] md:max-h-[760px] md:max-w-[520px] md:rounded-2xl md:shadow-2xl">
        <header className="flex items-center gap-3 bg-gradient-to-b from-pokedex-red to-pokedex-red-dark px-5 py-4 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-pokedex-red-dark text-2xl leading-none text-pokedex-cream ring-1 ring-inset ring-black/20 transition-transform duration-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-cream/60"
            aria-label="Close detail view"
          >
            ×
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-sm text-pokedex-cream/70">
              {formatDexNumber(pokedexEntry.n)}
            </p>
            <h2 className="truncate font-display text-lg font-bold uppercase leading-tight tracking-wide text-pokedex-cream">
              {pokedexEntry.name}
            </h2>
          </div>
          <span className="rounded-full bg-pokedex-lcd px-3 py-1 font-mono text-xs uppercase tracking-widest text-pokedex-lcd-dark shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
            {lang.toUpperCase()}
          </span>
        </header>

        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex-1 space-y-6 overflow-y-auto">
          {!slot ? (
            <div className="p-5">
              <div className="rounded-lg border border-pokedex-cream-dark/60 bg-white p-3 font-body text-sm text-pokedex-charcoal/80">
                Loading slot details...
              </div>
            </div>
          ) : (
            <>
              <section className="p-5">
                <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-lg">
                  {hasThumbnail ? (
                    <img
                      src={imageSource}
                      alt={`${pokedexEntry.name} thumbnail`}
                      className="max-h-[320px] w-full max-w-full rounded-lg border-2 border-pokedex-cream-dark object-contain shadow-lg shadow-black/10"
                    />
                  ) : (
                    <div className="space-y-3 text-center">
                      <div className="flex items-center justify-center rounded-lg bg-pokedex-cream-dark/30 p-8">
                        <img
                          src={imageSource}
                          alt={`${pokedexEntry.name} official artwork`}
                          className="max-h-[200px] max-w-[200px] object-contain"
                        />
                      </div>
                      <p className="font-body text-sm italic text-pokedex-charcoal/50">
                        No photo captured yet
                      </p>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={triggerCapture}
                  disabled={isSaving}
                  className="mx-auto mt-4 flex w-fit items-center justify-center gap-2 rounded-full bg-pokedex-red px-5 py-2.5 font-display text-sm uppercase tracking-wider text-pokedex-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_2px_6px_rgba(0,0,0,0.15)] transition-transform duration-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red/30 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {hasThumbnail ? '📷 Replace Photo' : '📷 Capture Photo'}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
              </section>

              <section className="border-t border-pokedex-cream-dark/50 bg-pokedex-cream p-5">
                {isEditing ? (
                  <div className="space-y-3">
                    <label className="block">
                      <span className="font-mono text-xs uppercase tracking-widest text-pokedex-charcoal/60">
                        SET
                      </span>
                      <input
                        type="text"
                        value={formValues.setHint}
                        onChange={(event) =>
                          handleFieldChange('setHint', event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-pokedex-cream-dark bg-white px-3 py-2 font-body text-pokedex-charcoal focus:border-pokedex-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red/20"
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-xs uppercase tracking-widest text-pokedex-charcoal/60">
                        CARD NO.
                      </span>
                      <input
                        type="text"
                        value={formValues.cardNumber}
                        onChange={(event) =>
                          handleFieldChange('cardNumber', event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-pokedex-cream-dark bg-white px-3 py-2 font-body text-pokedex-charcoal focus:border-pokedex-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red/20"
                      />
                    </label>
                    <label className="block">
                      <span className="font-mono text-xs uppercase tracking-widest text-pokedex-charcoal/60">
                        NOTES
                      </span>
                      <textarea
                        rows={3}
                        value={formValues.notes}
                        onChange={(event) =>
                          handleFieldChange('notes', event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-pokedex-cream-dark bg-white px-3 py-2 font-body text-pokedex-charcoal focus:border-pokedex-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red/20"
                      />
                    </label>
                    <div className="mt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`${actionButtonClass} bg-pokedex-red px-5 py-2.5 text-pokedex-cream shadow-md`}
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className={`${actionButtonClass} border border-pokedex-charcoal/20 bg-white text-pokedex-charcoal hover:bg-pokedex-cream-dark/20`}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-pokedex-charcoal/60">
                        SET
                      </p>
                      <p className={rowValueClass}>
                        {slot.setHint?.trim() ? slot.setHint : (
                          <span className="text-pokedex-charcoal/50">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-pokedex-charcoal/60">
                        CARD NO.
                      </p>
                      <p className="font-mono text-sm text-pokedex-charcoal">
                        {slot.cardNumber?.trim() ? slot.cardNumber : (
                          <span className="text-pokedex-charcoal/50">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-pokedex-charcoal/60">
                        NOTES
                      </p>
                      <p className="whitespace-pre-wrap font-body text-sm text-pokedex-charcoal/80">
                        {slot.notes?.trim() ? slot.notes : (
                          <span className="text-pokedex-charcoal/50">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <p className="font-mono text-xs uppercase tracking-widest text-pokedex-charcoal/60">
                        ADDED
                      </p>
                      <p className="font-mono text-sm text-pokedex-charcoal">
                        {formatAddedDate(slot.addedAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-pokedex-charcoal/20 bg-white px-4 py-2 font-display text-sm uppercase tracking-wider text-pokedex-charcoal transition-all duration-100 hover:bg-pokedex-cream-dark/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red/30"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </section>
            </>
          )}

          {errorMessage ? (
            <p className="mx-5 rounded-lg border border-pokedex-red-dark/30 bg-pokedex-red-light/20 p-3 font-body text-sm text-pokedex-red-dark">
              {errorMessage}
            </p>
          ) : null}
          </div>

          {slot ? (
            <section className="mt-auto border-t-2 border-pokedex-cream-dark/60 bg-pokedex-cream-dark/20 p-5">
              <p className="mb-3 font-mono text-xs uppercase tracking-widest text-pokedex-charcoal/50">
                Danger Zone
              </p>
              {!pendingRemoval ? (
                <button
                  type="button"
                  onClick={() => setPendingRemoval(true)}
                  className="w-full rounded-full border border-pokedex-red-dark/40 bg-transparent px-4 py-2 font-display text-sm uppercase tracking-wider text-pokedex-red-dark transition-all duration-100 hover:bg-pokedex-red-light/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red/30 sm:w-auto"
                >
                  Remove from collection
                </button>
              ) : (
                <div className="space-y-3 rounded-lg border border-pokedex-red-dark/20 bg-pokedex-cream p-4">
                  <p className="font-body text-sm text-pokedex-charcoal">
                    Remove <strong>{pokedexEntry.name}</strong> from your{' '}
                    {lang.toUpperCase()} collection? The photo and notes will be
                    lost.
                  </p>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={handleConfirmRemove}
                      disabled={isSaving}
                      className={`${actionButtonClass} bg-pokedex-red px-5 py-2.5 text-pokedex-cream shadow-md`}
                    >
                      Yes, remove
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingRemoval(false)}
                      disabled={isSaving}
                      className={`${actionButtonClass} border border-pokedex-charcoal/20 bg-white text-pokedex-charcoal hover:bg-pokedex-cream-dark/20`}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
          ) : null}
        </div>
      </div>
    </div>
  )
}
