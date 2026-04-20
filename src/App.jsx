import { useEffect, useState } from 'react'
import AppHeader from './components/AppHeader'
import BrowseView from './components/BrowseView'
import InstallPrompt from './components/InstallPrompt'
import ScanView from './components/ScanView'
import SettingsDrawer from './components/SettingsDrawer'
import SignInScreen from './components/SignInScreen'
import { supabase } from './lib/supabase'
import { LANGUAGES } from './lib/db'
import { getMeta, seedIfEmpty, setMeta } from './lib/collection'
import { pullSlotsFromCloud } from './lib/sync'

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
  const [authLoading, setAuthLoading] = useState(true)
  const [session, setSession] = useState(null)
  const [isInitializing, setIsInitializing] = useState(false)
  const [activeLanguage, setActiveLanguage] = useState(LANGUAGES.JAPANESE)
  const [activeView, setActiveView] = useState(VIEWS.BROWSE)
  const [refreshToken, setRefreshToken] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    let mounted = true
    console.log('[auth] effect running')

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log(
        '[auth] state change event:',
        event,
        'has session:',
        !!newSession,
      )
      if (!mounted) {
        return
      }
      setSession(() => newSession)
      if (newSession && window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname)
      }
    })

    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession }, error }) => {
        console.log(
          '[auth] initial session:',
          initialSession ? 'has session' : 'null',
        )
        if (!mounted) {
          return
        }
        if (error) {
          setErrorMessage(error.message)
          setAuthLoading(false)
          return
        }
        setSession(initialSession)
        setAuthLoading(false)
        if (initialSession?.user) {
          setIsInitializing(true)
        }
      })
      .catch((error) => {
        if (!mounted) {
          return
        }
        setErrorMessage(
          error instanceof Error ? error.message : String(error),
        )
        setAuthLoading(false)
      })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    if (authLoading || !session?.user?.id) {
      return
    }

    let isMounted = true

    async function initializeApp() {
      try {
        await seedIfEmpty()
        const userId = session?.user?.id
        if (userId) {
          const stats = await pullSlotsFromCloud(userId)
          console.log('[sync] initial pull complete', stats)
        }
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
  }, [authLoading, session?.user?.id])

  useEffect(() => {
    if (!session || isInitializing) {
      return
    }
    setMeta(ACTIVE_LANGUAGE_META_KEY, activeLanguage).catch((error) => {
      console.error('Failed to persist active language', error)
    })
  }, [activeLanguage, isInitializing, session])

  useEffect(() => {
    if (!session || isInitializing) {
      return
    }
    setMeta(ACTIVE_VIEW_META_KEY, activeView).catch((error) => {
      console.error('Failed to persist active view', error)
    })
  }, [activeView, isInitializing, session])

  function refreshCollection() {
    setRefreshToken((current) => current + 1)
  }

  if (authLoading) {
    console.log('[render] loading')
    return (
      <main className="min-h-screen bg-red-50">
        <div className="mx-auto max-w-[720px] px-4 py-4 text-gray-600">
          Loading…
        </div>
      </main>
    )
  }

  if (!session) {
    console.log('[render] signin')
    return (
      <>
        <SignInScreen />
        <InstallPrompt />
      </>
    )
  }

  if (isInitializing) {
    console.log('[render] loading')
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
    console.log('[render] error')
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

  console.log('[render] app')
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
      <SettingsDrawer
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        refreshToken={refreshToken}
        onCollectionCleared={refreshCollection}
        session={session}
      />
    </main>
  )
}

export default App
