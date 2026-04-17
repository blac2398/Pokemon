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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-0 sm:p-4"
      onClick={handleBackdropClick}
    >
      <div className="flex h-full w-full flex-col bg-white sm:h-[90vh] sm:max-h-[760px] sm:max-w-[520px] sm:rounded-2xl sm:shadow-xl">
        <header className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-2xl leading-none text-gray-600 hover:bg-gray-100"
            aria-label="Close detail view"
          >
            ×
          </button>
          <h2 className="truncate px-3 text-center text-base font-semibold text-gray-900">
            {formatDexNumber(pokedexEntry.n)} {pokedexEntry.name}
          </h2>
          <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
            {lang.toUpperCase()}
          </span>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-4 py-4">
          {!slot ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              Loading slot details...
            </div>
          ) : (
            <>
              <section className="space-y-3">
                <div className="flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border border-gray-200 bg-gray-100 p-2">
                  <img
                    src={imageSource}
                    alt={hasThumbnail ? `${pokedexEntry.name} thumbnail` : `${pokedexEntry.name} official artwork`}
                    className="max-h-[280px] w-full object-contain"
                  />
                </div>
                <button
                  type="button"
                  onClick={triggerCapture}
                  disabled={isSaving}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {hasThumbnail ? '📷 Replace Photo' : '📷 Add Photo'}
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

              <section className="space-y-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Set
                      <input
                        type="text"
                        value={formValues.setHint}
                        onChange={(event) =>
                          handleFieldChange('setHint', event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                      Card Number
                      <input
                        type="text"
                        value={formValues.cardNumber}
                        onChange={(event) =>
                          handleFieldChange('cardNumber', event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-gray-700">
                      Notes
                      <textarea
                        rows={3}
                        value={formValues.notes}
                        onChange={(event) =>
                          handleFieldChange('notes', event.target.value)
                        }
                        className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-gray-800">
                    <p>
                      <span className="font-semibold">Set:</span>{' '}
                      {slot.setHint?.trim() ? slot.setHint : '-'}
                    </p>
                    <p>
                      <span className="font-semibold">Card Number:</span>{' '}
                      {slot.cardNumber?.trim() ? slot.cardNumber : '-'}
                    </p>
                    <p>
                      <span className="font-semibold">Notes:</span>{' '}
                      {slot.notes?.trim() ? slot.notes : '-'}
                    </p>
                    <p>
                      <span className="font-semibold">Added:</span>{' '}
                      {formatAddedDate(slot.addedAt)}
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="mt-2 rounded-md border border-gray-300 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      ✏️ Edit
                    </button>
                  </div>
                )}
              </section>

              <section className="border-t border-red-200 pt-4">
                {!pendingRemoval ? (
                  <button
                    type="button"
                    onClick={() => setPendingRemoval(true)}
                    className="w-full rounded-md border border-red-400 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                  >
                    Remove from collection
                  </button>
                ) : (
                  <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-800">
                      Remove {pokedexEntry.name} from your {lang.toUpperCase()}{' '}
                      collection? The thumbnail and metadata will be lost.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmRemove}
                        disabled={isSaving}
                        className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Yes, remove
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingRemoval(false)}
                        disabled={isSaving}
                        className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          {errorMessage ? (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
