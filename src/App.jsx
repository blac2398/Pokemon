import { useEffect, useState } from 'react'
import BrowseView from './components/BrowseView'
import ScanView from './components/ScanView'
import { LANGUAGES } from './lib/db'
import { getMeta, seedIfEmpty, setMeta } from './lib/collection'

const ACTIVE_LANGUAGE_META_KEY = 'activeLanguage'
const ACTIVE_VIEW_META_KEY = 'activeView'

const VIEWS = {
  BROWSE: 'browse',
  SCAN: 'scan',
}

function isLanguageSupported(language) {
  return language === LANGUAGES.JAPANESE || language === LANGUAGES.ENGLISH
}

function App() {
  const [isInitializing, setIsInitializing] = useState(true)
  const [activeLanguage, setActiveLanguage] = useState(LANGUAGES.JAPANESE)
  const [activeView, setActiveView] = useState(VIEWS.BROWSE)
  const [refreshToken, setRefreshToken] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    let isMounted = true

    async function initializeApp() {
      try {
        await seedIfEmpty()
        const storedLanguage = await getMeta(
          ACTIVE_LANGUAGE_META_KEY,
          LANGUAGES.JAPANESE,
        )
        const storedView = await getMeta(ACTIVE_VIEW_META_KEY, VIEWS.BROWSE)
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
        <header className="bg-red-700 px-4 py-4 text-white shadow-sm">
          <div className="mx-auto max-w-[720px]">
            <h1 className="text-xl font-bold tracking-wide">Pokedex Tracker</h1>
          </div>
        </header>
        <div className="mx-auto max-w-[720px] px-4 py-4 text-gray-600">
          Loading app...
        </div>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main className="min-h-screen bg-red-50">
        <header className="bg-red-700 px-4 py-4 text-white shadow-sm">
          <div className="mx-auto max-w-[720px]">
            <h1 className="text-xl font-bold tracking-wide">Pokedex Tracker</h1>
          </div>
        </header>
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
      <header className="bg-red-700 px-4 py-4 text-white shadow-sm">
        <div className="mx-auto max-w-[720px]">
          <h1 className="text-xl font-bold tracking-wide">Pokedex Tracker</h1>
        </div>
      </header>

      <div className="mx-auto max-w-[720px] px-4 py-4">
        <div className="mb-4 flex overflow-hidden rounded-lg border border-red-700 bg-white">
          <button
            type="button"
            className={`w-1/2 py-2 text-sm font-bold tracking-wide ${
              activeView === VIEWS.BROWSE
                ? 'bg-red-700 text-yellow-300'
                : 'text-red-700 hover:bg-red-50'
            }`}
            onClick={() => setActiveView(VIEWS.BROWSE)}
          >
            Browse
          </button>
          <button
            type="button"
            className={`w-1/2 py-2 text-sm font-bold tracking-wide ${
              activeView === VIEWS.SCAN
                ? 'bg-red-700 text-yellow-300'
                : 'text-red-700 hover:bg-red-50'
            }`}
            onClick={() => setActiveView(VIEWS.SCAN)}
          >
            Scan
          </button>
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
    </main>
  )
}

export default App
