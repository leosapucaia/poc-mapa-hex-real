import { useState } from 'react'
import { MapRegionSelector } from './components/MapRegionSelector'
import type { RegionSelection } from './lib/types'

function App() {
  const [confirmed, setConfirmed] = useState<RegionSelection | null>(null)

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="border-b px-6 py-3 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold">🗺️ POC — Mapa Hexagonal</h1>
          <p className="text-muted-foreground text-xs">
            Selecione uma região para converter em grid hexagonal
          </p>
        </div>
        {confirmed && (
          <div className="text-xs text-muted-foreground text-right">
            <div className="font-medium text-foreground">
              Região confirmada
            </div>
            <div>
              ~{Math.round(confirmed.sizeKm.width)}×{Math.round(confirmed.sizeKm.height)} km
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 relative">
        <MapRegionSelector onConfirm={setConfirmed} />
      </main>
    </div>
  )
}

export default App
