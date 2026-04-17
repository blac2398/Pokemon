import { useEffect, useMemo, useState } from 'react'
import { getMeta, setMeta } from '../lib/collection'

const DISMISS_META_KEY = 'installPromptDismissed'
const TEN_SECONDS_MS = 10000

function isStandaloneMode() {
  return window.matchMedia('(display-mode: standalone)').matches
}

function detectIos() {
  const ua = navigator.userAgent || ''
  return /iPad|iPhone|iPod/.test(ua)
}

export default function InstallPrompt() {
  const [isReady, setIsReady] = useState(false)
  const [isDismissed, setIsDismissed] = useState(true)
  const [installEvent, setInstallEvent] = useState(null)
  const [isStandalone, setIsStandalone] = useState(true)
  const isIos = useMemo(() => detectIos(), [])

  useEffect(() => {
    let isMounted = true

    async function loadDismissState() {
      const dismissed = await getMeta(DISMISS_META_KEY, false)
      if (!isMounted) {
        return
      }
      setIsDismissed(Boolean(dismissed))
    }

    loadDismissState().catch((error) => {
      console.error('Failed to read install prompt state', error)
      if (isMounted) {
        setIsDismissed(false)
      }
    })

    const timer = window.setTimeout(() => {
      if (isMounted) {
        setIsReady(true)
      }
    }, TEN_SECONDS_MS)

    return () => {
      isMounted = false
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    const handleDisplayMode = () => setIsStandalone(isStandaloneMode())
    handleDisplayMode()
    mediaQuery.addEventListener('change', handleDisplayMode)
    return () => mediaQuery.removeEventListener('change', handleDisplayMode)
  }, [])

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setInstallEvent(event)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () =>
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  async function dismissPrompt() {
    setIsDismissed(true)
    try {
      await setMeta(DISMISS_META_KEY, true)
    } catch (error) {
      console.error('Failed to save install prompt state', error)
    }
  }

  async function handleNativeInstall() {
    if (!installEvent) {
      return
    }

    await installEvent.prompt()
    await installEvent.userChoice
    setInstallEvent(null)
    await dismissPrompt()
  }

  const shouldShowIosBanner = isReady && !isDismissed && !isStandalone && isIos
  const shouldShowNativeInstall =
    isReady && !isDismissed && !isStandalone && !isIos && Boolean(installEvent)

  if (!shouldShowIosBanner && !shouldShowNativeInstall) {
    return null
  }

  return (
    <div className="fixed inset-x-0 bottom-3 z-40 px-3">
      <div className="mx-auto flex w-full max-w-[720px] items-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 shadow-lg">
        <p className="flex-1 text-sm text-gray-800">
          {shouldShowIosBanner
            ? '📲 Install Pokedex: tap Share -> Add to Home Screen'
            : 'Install Pokedex for full-screen app access'}
        </p>
        {shouldShowNativeInstall ? (
          <button
            type="button"
            onClick={handleNativeInstall}
            className="rounded-md bg-red-700 px-2.5 py-1.5 text-sm font-semibold text-white hover:bg-red-600"
          >
            Install Pokedex
          </button>
        ) : null}
        <button
          type="button"
          onClick={dismissPrompt}
          className="rounded-md px-2 py-1 text-sm font-semibold text-gray-500 hover:bg-gray-100"
          aria-label="Dismiss install prompt"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
