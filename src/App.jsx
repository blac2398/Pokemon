import BrowseView from './components/BrowseView'

function App() {
  return (
    <main className="min-h-screen bg-red-50">
      <header className="bg-red-700 px-4 py-4 text-white shadow-sm">
        <div className="mx-auto max-w-[720px]">
          <h1 className="text-xl font-bold tracking-wide">Pokedex Tracker</h1>
        </div>
      </header>

      <div className="mx-auto max-w-[720px] px-4 py-4">
        <BrowseView />
      </div>
    </main>
  )
}

export default App
