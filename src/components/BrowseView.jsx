import { useEffect, useMemo, useState } from 'react'
import { LANGUAGES } from '../lib/db'
import {
  deleteSlot,
  getAllPokedex,
  getMeta,
  getSlots,
  seedIfEmpty,
  setMeta,
  upsertSlot,
} from '../lib/collection'
import LanguageToggle from './LanguageToggle'
import FilterBar from './FilterBar'
import PokedexRow from './PokedexRow'

const ACTIVE_LANGUAGE_META_KEY = 'activeLanguage'
const FILTERS = {
  ALL: 'all',
  OWNED: 'owned',
  MISSING: 'missing',
}

function isLanguageSupported(language) {
  return language === LANGUAGES.JAPANESE || language === LANGUAGES.ENGLISH
}

export default function BrowseView() {
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [activeLanguage, setActiveLanguage] = useState(LANGUAGES.JAPANESE)
  const [isLanguageReady, setIsLanguageReady] = useState(false)
  const [allEntries, setAllEntries] = useState([])
  const [ownedDexNums, setOwnedDexNums] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL)

  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        await seedIfEmpty()
        const storedLanguage = await getMeta(
          ACTIVE_LANGUAGE_META_KEY,
          LANGUAGES.JAPANESE,
        )
        const normalizedLanguage = isLanguageSupported(storedLanguage)
          ? storedLanguage
          : LANGUAGES.JAPANESE
        const entries = await getAllPokedex()

        if (!isMounted) {
          return
        }

        setActiveLanguage(normalizedLanguage)
        setIsLanguageReady(true)
        setAllEntries(entries)
      } catch (error) {
        if (!isMounted) {
          return
        }
        setErrorMessage(error instanceof Error ? error.message : String(error))
        setIsLoading(false)
      }
    }

    loadInitialData()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!isLanguageReady) {
      return
    }

    let isMounted = true

    async function loadLanguageSlots() {
      try {
        await setMeta(ACTIVE_LANGUAGE_META_KEY, activeLanguage)
        const slots = await getSlots(activeLanguage)
        if (!isMounted) {
          return
        }
        setErrorMessage('')
        setOwnedDexNums(new Set(slots.map((slot) => slot.dexNum)))
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

    loadLanguageSlots()

    return () => {
      isMounted = false
    }
  }, [activeLanguage, isLanguageReady])

  const filteredEntries = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    return allEntries.filter((entry) => {
      const nameMatch = entry.name.toLowerCase().includes(normalizedSearch)
      const dexMatch = String(entry.n).includes(normalizedSearch)
      const matchesSearch =
        normalizedSearch.length === 0 || nameMatch || dexMatch
      if (!matchesSearch) {
        return false
      }

      if (activeFilter === FILTERS.OWNED) {
        return ownedDexNums.has(entry.n)
      }
      if (activeFilter === FILTERS.MISSING) {
        return !ownedDexNums.has(entry.n)
      }
      return true
    })
  }, [activeFilter, allEntries, ownedDexNums, searchTerm])

  async function handleToggleOwnership(dexNum) {
    const wasOwned = ownedDexNums.has(dexNum)
    const nextOwnedDexNums = new Set(ownedDexNums)
    if (wasOwned) {
      nextOwnedDexNums.delete(dexNum)
    } else {
      nextOwnedDexNums.add(dexNum)
    }
    setOwnedDexNums(nextOwnedDexNums)

    try {
      if (wasOwned) {
        await deleteSlot(activeLanguage, dexNum)
      } else {
        // Create a slot with empty metadata so users can mark ownership quickly.
        await upsertSlot({ lang: activeLanguage, dexNum })
      }
    } catch (error) {
      // Roll back optimistic update if persistence fails.
      setOwnedDexNums(new Set(ownedDexNums))
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }

  if (errorMessage) {
    return (
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <p className="font-semibold text-red-700">Failed to load Browse view.</p>
        <p className="mt-1 text-sm text-gray-700">{errorMessage}</p>
      </section>
    )
  }

  if (isLoading) {
    return (
      <section className="rounded-lg bg-white p-4 shadow-sm">
        <p className="text-sm text-gray-600">Loading Pokedex...</p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <LanguageToggle
        activeLanguage={activeLanguage}
        onChange={setActiveLanguage}
      />

      <div className="rounded-lg bg-white p-3 shadow-sm">
        <p className="font-mono text-lg font-bold text-gray-900">
          OWNED: {ownedDexNums.size} / 1025
        </p>
      </div>

      <FilterBar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
      />

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        {filteredEntries.map((entry) => (
          <PokedexRow
            key={entry.n}
            entry={entry}
            isOwned={ownedDexNums.has(entry.n)}
            onToggle={() => handleToggleOwnership(entry.n)}
          />
        ))}
      </div>
    </section>
  )
}
