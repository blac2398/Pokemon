import { useEffect, useState } from 'react'
import AppHeader from './components/AppHeader'
import BrowseView from './components/BrowseView'
import InstallPrompt from './components/InstallPrompt'
import ScanView from './components/ScanView'
import { LANGUAGES } from './lib/db'
import {
  clearCollection,
  getMeta,
  getOwnedCount,
  seedIfEmpty,
  setMeta,
} from './lib/collection'

const ACTIVE_LANGUAGE_META_KEY = 'activeLanguage'
const ACTIVE_VIEW_META_KEY = 'activeView'
const APP_VERSION = '0.1.0'

const VIEWS = {
  BROWSE: 'browse',
  SCAN: 'scan',
}

function isLanguageSupported(language) {
  return language === LANGUAGES.JAPANESE || language === LANGUAGES.ENGLISH
}

function SettingsModal({ isOpen, onClose, refreshToken, onCollectionCleared }) {
  const [counts, setCounts] = useState({ jp: 0, en: 0 })
  const [isLoading, setIsLoading] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [pendingClear, setPendingClear] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setIsClearing(false)
    }
  }

  if (!isOpen) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-gray-900">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-gray-500 hover:bg-gray-100"
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="mt-4 space-y-2 text-sm text-gray-700">
          <p className="font-semibold">Pokedex Tracker - v{APP_VERSION}</p>
          {isLoading ? (
            <p>Loading your collection...</p>
          ) : (
            <p>
              JP: {counts.jp} / 1025 owned | EN: {counts.en} / 1025 owned
            </p>
          )}
        </div>

        <div className="mt-5 border-t border-red-100 pt-4">
          {!pendingClear ? (
            <button
              type="button"
              onClick={() => setPendingClear(true)}
              className="w-full rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
            >
              Clear collection
            </button>
          ) : (
            <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">
                Clear all JP and EN slots? This removes owned state, notes, and
                thumbnails for your whole collection.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleClearCollection}
                  disabled={isClearing}
                  className="rounded-md bg-red-700 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Yes, clear all
                </button>
                <button
                  type="button"
                  onClick={() => setPendingClear(false)}
                  disabled={isClearing}
                  className="rounded-md border border-red-300 px-3 py-2 text-sm font-semibold text-red-700 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {errorMessage ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function App() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [activeLanguage, setActiveLanguage] = useState(LANGUAGES.JAPANESE)
  const [activeView, setActiveView] = useState(VIEWS.BROWSE)
  const [refreshToken, setRefreshToken] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function initializeApp() {
      try {
        await seedIfEmpty()
        const storedLanguage = await getMeta(
          ACTIVE_LANGUAGE_META_KEY,
          LANGUAGES.JAPANESE,
        )
        const storedView = await getMeta('activeView', 'browse')
        if (!isMounted) {
          return
        }

        setActiveLanguage(
          isLanguageSupported(storedLanguage)
            ? storedLanguage
            : LANGUAGES.JAPANESE,
        )
        setActiveView(storedView === VIEWS.SCAN ? VIEWS.SCAN : VIEWS.BROWSE)
        setErrorMessage('')
      } catch (error) {
        if (!isMounted) {
          return
        }
        setErrorMessage(error instanceof Error ? error.message : String(error))
      } finally {
        if (isMounted) {
          setIsInitializing(false)
        }
      }
    }

    initializeApp()
    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (isInitializing) {
      return
    }
    setMeta(ACTIVE_LANGUAGE_META_KEY, activeLanguage).catch((error) => {
      console.error('Failed to persist active language', error)
    })
  }, [activeLanguage, isInitializing])

  useEffect(() => {
    if (isInitializing) {
      return
    }
    setMeta(ACTIVE_VIEW_META_KEY, activeView).catch((error) => {
      console.error('Failed to persist active view', error)
    })
  }, [activeView, isInitializing])

  function refreshCollection() {
    setRefreshToken((current) => current + 1)
  }

  if (isInitializing) {
    return (
      <main className="min-h-screen bg-red-50">
        <AppHeader onOpenSettings={() => setSettingsOpen(true)} />
        <div className="mx-auto max-w-[720px] px-4 py-4 text-gray-600">
          Loading app...
        </div>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-red-50">
        <AppHeader onOpenSettings={() => setSettingsOpen(true)} />
        <div className="mx-auto max-w-[720px] px-4 py-4">
          <section className="rounded-lg bg-white p-4 shadow-sm">
            <p className="font-semibold text-red-700">Failed to load app.</p>
            <p className="mt-1 text-sm text-gray-700">{errorMessage}</p>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-red-50">
      <AppHeader onOpenSettings={() => setSettingsOpen(true)} />

      <div className="mx-auto max-w-[720px] px-4 py-4 pb-24">
        <div className="my-4 flex justify-center">
          <div className="inline-flex rounded-full bg-pokedex-cream-dark/60 p-1">
            <button
              type="button"
              className={`rounded-full px-6 py-2 font-display text-sm uppercase tracking-wider transition-colors ${
                activeView === VIEWS.BROWSE
                  ? 'bg-pokedex-red text-pokedex-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.15)]'
                  : 'text-pokedex-charcoal/60 hover:text-pokedex-charcoal'
              }`}
              onClick={() => setActiveView(VIEWS.BROWSE)}
            >
              Browse
            </button>
            <button
              type="button"
              className={`rounded-full px-6 py-2 font-display text-sm uppercase tracking-wider transition-colors ${
                activeView === VIEWS.SCAN
                  ? 'bg-pokedex-red text-pokedex-cream shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_2px_4px_rgba(0,0,0,0.15)]'
                  : 'text-pokedex-charcoal/60 hover:text-pokedex-charcoal'
              }`}
              onClick={() => setActiveView(VIEWS.SCAN)}
            >
              Scan
            </button>
          </div>
        </div>

        {activeView === VIEWS.BROWSE ? (
          <BrowseView
            activeLanguage={activeLanguage}
            onLanguageChange={setActiveLanguage}
            refreshToken={refreshToken}
          />
        ) : (
          <ScanView
            activeLanguage={activeLanguage}
            onCollectionChanged={refreshCollection}
          />
        )}
      </div>
      <InstallPrompt />
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        refreshToken={refreshToken}
        onCollectionCleared={refreshCollection}
      />
    </main>
  )
}

export default App
