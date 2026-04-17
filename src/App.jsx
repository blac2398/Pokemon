import { useEffect, useState } from 'react'
import { LANGUAGES } from './lib/db'
import { seedIfEmpty, getAllPokedex, getOwnedCount } from './lib/collection'

function App() {
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')
  const [pokedexCount, setPokedexCount] = useState(0)
  const [jpOwnedCount, setJpOwnedCount] = useState(0)
  const [enOwnedCount, setEnOwnedCount] = useState(0)

  useEffect(() => {
    let isMounted = true

    async function loadData() {
      setIsLoading(true)
      setErrorMessage('')

      try {
        await seedIfEmpty()
        const [pokedexEntries, jpCount, enCount] = await Promise.all([
          getAllPokedex(),
          getOwnedCount(LANGUAGES.JAPANESE),
          getOwnedCount(LANGUAGES.ENGLISH),
        ])

        if (!isMounted) {
          return
        }

        setPokedexCount(pokedexEntries.length)
        setJpOwnedCount(jpCount)
        setEnOwnedCount(enCount)
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

    loadData()

    return () => {
      isMounted = false
    }
  }, [])

  if (isLoading) {
    return (
      <main>
        <p>Loading data...</p>
      </main>
    )
  }

  if (errorMessage) {
    return (
      <main>
        <p>Failed to load data.</p>
        <p>{errorMessage}</p>
      </main>
    )
  }

  return (
    <main>
      <h1>Pokédex Tracker — Data Layer Check</h1>
      <p>Pokédex count: {pokedexCount}</p>
      <p>JP owned: {jpOwnedCount}</p>
      <p>EN owned: {enOwnedCount}</p>
    </main>
  )
}

export default App
