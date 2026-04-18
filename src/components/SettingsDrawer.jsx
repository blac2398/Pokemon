import { useEffect, useState } from 'react'
import { LANGUAGES } from '../lib/db'
import { clearCollection, getOwnedCount } from '../lib/collection'

const TOTAL_DEX = 1025

function versionDisplay() {
  const v = import.meta.env.VITE_APP_VERSION
  if (!v) {
    return 'v0.1.0'
  }
  const s = String(v)
  return s.startsWith('v') ? s : `v${s}`
}

function TrashIcon({ className }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </svg>
  )
}

export default function SettingsDrawer({
  isOpen,
  onClose,
  refreshToken,
  onCollectionCleared,
}) {
  const [counts, setCounts] = useState({ jp: 0, en: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [pendingClear, setPendingClear] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [rendered, setRendered] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setRendered(true)
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    }
    setVisible(false)
    const t = window.setTimeout(() => setRendered(false), 200)
    return () => window.clearTimeout(t)
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      setPendingClear(false)
      setErrorMessage('')
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    let isMounted = true
    async function loadCounts() {
      setIsLoading(true)
      setErrorMessage('')
      try {
        const [jp, en] = await Promise.all([
          getOwnedCount(LANGUAGES.JAPANESE),
          getOwnedCount(LANGUAGES.ENGLISH),
        ])
        if (!isMounted) {
          return
        }
        setCounts({ jp, en })
      } catch (error) {
        if (!isMounted) {
          return
        }
        setErrorMessage(error instanceof Error ? error.message : String(error))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCounts()
    return () => {
      isMounted = false
    }
  }, [isOpen, refreshToken])

  useEffect(() => {
    if (!rendered) {
      return
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        onClose?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [rendered, onClose])

  async function handleClearCollection() {
    if (isClearing) {
      return
    }
    setIsClearing(true)
    setErrorMessage('')
    try {
      await clearCollection()
      setCounts({ jp: 0, en: 0 })
      setPendingClear(false)
      onCollectionCleared?.()
      onClose?.()
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsClearing(false)
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      onClose?.()
    }
  }

  if (!rendered) {
    return null
  }

  const jpPct = Math.min(100, (counts.jp / TOTAL_DEX) * 100)
  const enPct = Math.min(100, (counts.en / TOTAL_DEX) * 100)
  const jpOwned =
    isLoading ? '····' : String(counts.jp).padStart(4, '0')
  const enOwned =
    isLoading ? '····' : String(counts.en).padStart(4, '0')

  return (
    <div
      className={`fixed inset-0 z-50 flex items-stretch justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-200 md:items-center md:p-4 ${
        visible ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`flex h-full min-h-0 w-full max-h-[100dvh] flex-col overflow-hidden bg-pokedex-cream shadow-2xl transition-all duration-200 md:h-auto md:max-h-[90vh] md:max-w-[480px] md:rounded-2xl ${
          visible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center gap-3 bg-gradient-to-b from-pokedex-red to-pokedex-red-dark px-5 py-4 shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)]">
          <span
            aria-hidden="true"
            className="h-2.5 w-2.5 shrink-0 animate-led-pulse rounded-full bg-pokedex-led shadow-[0_0_8px_rgba(74,222,128,0.8)]"
          />
          <h2 className="min-w-0 flex-1 font-display text-lg font-bold uppercase tracking-wide text-pokedex-cream">
            SETTINGS
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-pokedex-red-dark text-xl leading-none text-pokedex-cream ring-1 ring-inset ring-black/20 transition-transform duration-100 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-cream/60"
            aria-label="Close settings"
          >
            ×
          </button>
        </header>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <section className="border-b border-pokedex-cream-dark/50 bg-pokedex-cream p-5">
            <h3 className="mb-3 font-display text-xs uppercase tracking-[0.15em] text-pokedex-charcoal/60">
              DEVICE
            </h3>
            <div className="rounded-md border-2 border-pokedex-lcd-dark/30 bg-pokedex-lcd px-4 py-3 font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
              <div className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1 text-xs sm:text-sm">
                <span className="text-pokedex-lcd-dark/55">MODEL</span>
                <span className="font-bold text-pokedex-lcd-dark">
                  POKÉDEX TRACKER
                </span>
                <span className="text-pokedex-lcd-dark/55">VERSION</span>
                <span className="font-bold text-pokedex-lcd-dark">
                  {versionDisplay()}
                </span>
                <span className="text-pokedex-lcd-dark/55">STATUS</span>
                <span className="flex items-center gap-1.5 font-bold text-pokedex-lcd-dark">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full bg-pokedex-led shadow-[0_0_8px_rgba(74,222,128,0.9)]"
                    aria-hidden="true"
                  />
                  ONLINE
                </span>
              </div>
            </div>
          </section>

          <section className="border-b border-pokedex-cream-dark/50 bg-pokedex-cream-dark/20 p-5">
            <h3 className="mb-3 font-display text-xs uppercase tracking-[0.15em] text-pokedex-charcoal/60">
              COLLECTIONS
            </h3>
            <div className="space-y-3">
              <CollectionPanel
                label="JP"
                owned={jpOwned}
                pct={isLoading ? 0 : jpPct}
              />
              <CollectionPanel
                label="EN"
                owned={enOwned}
                pct={isLoading ? 0 : enPct}
              />
            </div>
          </section>

          <section className="border-t-4 border-pokedex-cream-dark/60 bg-red-50/30 p-5">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-widest text-red-900/50">
              DANGER ZONE
            </p>
            {!pendingClear ? (
              <button
                type="button"
                onClick={() => setPendingClear(true)}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-red-700/40 bg-transparent px-4 py-2.5 font-display text-xs uppercase tracking-wider text-red-700 transition-all duration-100 hover:bg-red-50 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red/30"
              >
                <TrashIcon className="h-4 w-4 shrink-0" />
                Clear All Collections
              </button>
            ) : (
              <div className="space-y-3 rounded-lg border border-amber-200 bg-amber-50 p-4">
                <p className="font-body text-sm text-amber-900">
                  Clear all your collections? This will remove every Pokémon from
                  both JP and EN, along with their photos and notes. This{' '}
                  <strong>cannot be undone</strong>.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleClearCollection}
                    disabled={isClearing}
                    className="inline-flex flex-1 items-center justify-center rounded-full bg-pokedex-red px-5 py-2.5 font-display text-sm uppercase tracking-wider text-pokedex-cream shadow-md transition-transform duration-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 min-w-[140px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-red/30"
                  >
                    Yes, clear all
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingClear(false)}
                    disabled={isClearing}
                    className="inline-flex flex-1 items-center justify-center rounded-full border border-pokedex-charcoal/20 bg-transparent px-5 py-2.5 font-display text-sm uppercase tracking-wider text-pokedex-charcoal transition-transform duration-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 min-w-[140px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pokedex-charcoal/30"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>

          {errorMessage ? (
            <p className="mx-5 mt-4 mb-5 rounded-lg border border-pokedex-red-dark/30 bg-pokedex-red-light/20 p-3 font-body text-sm text-pokedex-red-dark">
              {errorMessage}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}

function CollectionPanel({ label, owned, pct }) {
  return (
    <div className="rounded-md bg-pokedex-lcd px-4 py-3 font-mono shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-pokedex-lcd-dark px-2.5 py-0.5 font-mono text-xs uppercase tracking-widest text-pokedex-lcd">
          {label}
        </span>
        <span className="font-bold text-pokedex-lcd-dark">
          {owned} / {TOTAL_DEX}
        </span>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pokedex-lcd-dark/20">
        <div
          className="h-full bg-pokedex-lcd-dark transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
