import { useEffect, useMemo, useState } from 'react'
import { LANGUAGES } from '../lib/db'
import {
  deleteSlot,
  getAllPokedex,
  getSlot,
  getSlots,
  upsertSlot,
} from '../lib/collection'
import LanguageToggle from './LanguageToggle'
import FilterBar from './FilterBar'
import PokedexRow from './PokedexRow'
import SlotDetailView from './SlotDetailView'

const FILTERS = {
  ALL: 'all',
  OWNED: 'owned',
  MISSING: 'missing',
}

function isLanguageSupported(language) {
  return language === LANGUAGES.JAPANESE || language === LANGUAGES.ENGLISH
}

export default function BrowseView({
  activeLanguage,
  onLanguageChange,
  refreshToken = 0,
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [allEntries, setAllEntries] = useState([])
  const [ownedDexNums, setOwnedDexNums] = useState(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilter, setActiveFilter] = useState(FILTERS.ALL)
  const [detailViewOpen, setDetailViewOpen] = useState(false)
  const [detailSlot, setDetailSlot] = useState(null)
  const [detailPokedex, setDetailPokedex] = useState(null)
  const ownedCount = ownedDexNums.size
  const ownedCountLabel = String(ownedCount).padStart(4, '0')
  const ownedPercentage = Math.floor((ownedCount / 1025) * 100)

  useEffect(() => {
    let isMounted = true

    async function loadInitialData() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        const entries = await getAllPokedex()

        if (!isMounted) {
          return
        }

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
    if (!isLanguageSupported(activeLanguage)) {
      return
    }

    let isMounted = true

    async function loadLanguageSlots() {
      try {
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
  }, [activeLanguage, refreshToken])

  async function refreshOwnedSet() {
    const slots = await getSlots(activeLanguage)
    setOwnedDexNums(new Set(slots.map((slot) => slot.dexNum)))
  }

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

  async function handleOpenDetail(entry) {
    setDetailPokedex({ n: entry.n, name: entry.name })
    setDetailSlot(null)
    setDetailViewOpen(true)
    try {
      const slot = await getSlot(activeLanguage, entry.n)
      setDetailSlot(slot ?? null)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
      setDetailViewOpen(false)
    }
  }

  async function handleDetailChange() {
    try {
      await refreshOwnedSet()
      if (detailPokedex) {
        const slot = await getSlot(activeLanguage, detailPokedex.n)
        setDetailSlot(slot ?? null)
      }
      setErrorMessage('')
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    }
  }

  function handleCloseDetail() {
    setDetailViewOpen(false)
    setDetailSlot(null)
    setDetailPokedex(null)
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
    <section className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="mb-4 flex justify-center">
        <LanguageToggle
          activeLanguage={activeLanguage}
          onChange={onLanguageChange}
        />
      </div>

      <div className="mx-auto my-4 max-w-md rounded-md border-2 border-pokedex-lcd-dark/30 bg-pokedex-lcd px-5 py-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.15)]">
        <div className="flex items-end justify-between gap-4">
          <p className="font-mono text-xs uppercase tracking-widest text-pokedex-lcd-dark/70">
            OWNED
          </p>
          <div className="flex items-end justify-end gap-1 text-right">
            <span className="font-mono text-2xl font-bold text-pokedex-lcd-dark">
              {ownedCountLabel}
            </span>
            <span className="font-mono text-2xl text-pokedex-lcd-dark/50">/</span>
            <span className="font-mono text-2xl text-pokedex-lcd-dark/80">
              1025
            </span>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-pokedex-lcd-dark/20">
          <div
            className="h-full bg-pokedex-lcd-dark transition-all duration-500 ease-out"
            style={{ width: `${ownedPercentage}%` }}
            aria-hidden="true"
          />
        </div>
      </div>

      <div className="mb-4">
        <FilterBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />
      </div>

      <div className="space-y-2">
        {filteredEntries.length > 0 ? (
          filteredEntries.map((entry) => (
            <PokedexRow
              key={entry.n}
              entry={entry}
              isOwned={ownedDexNums.has(entry.n)}
              onToggle={() => handleToggleOwnership(entry.n)}
              onOpenDetail={handleOpenDetail}
            />
          ))
        ) : (
          <div className="py-16 text-center text-pokedex-charcoal/40">
            <p className="text-2xl" aria-hidden="true">
              🔍
            </p>
            <p className="mt-2 font-body text-sm">No Pokemon match your search</p>
          </div>
        )}
      </div>

      {detailViewOpen && detailPokedex ? (
        <SlotDetailView
          slot={detailSlot}
          pokedexEntry={detailPokedex}
          lang={activeLanguage}
          onClose={handleCloseDetail}
          onChange={handleDetailChange}
        />
      ) : null}
    </section>
  )
}
