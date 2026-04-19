import { useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { MapRegionSelector } from './components/MapRegionSelector'
import { HexGridPreview } from './components/HexGridPreview'
import type { RegionSelection } from './lib/types'
import type { HexGrid } from './lib/hex-grid'
import type { ElevationData } from './lib/elevation'

type PipelineState = 'idle' | 'loading' | 'ready' | 'error'

function App() {
  const [pipelineState, setPipelineState] = useState<PipelineState>('idle')
  const [hexGrid, setHexGrid] = useState<HexGrid | null>(null)
  const [mapRef, setMapRef] = useState<maplibregl.Map | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const [cellCount, setCellCount] = useState(0)

  const handleConfirm = useCallback(async (selection: RegionSelection) => {
    setPipelineState('loading')
    setHexGrid(null)
    setStatusMsg('Buscando dados de elevação...')

    try {
      // Dynamic imports to keep initial load fast
      const { fetchElevation } = await import('./lib/elevation')
      const { fetchFeatures } = await import('./lib/features')
      const { generateHexGrid } = await import('./lib/hex-grid')

      // 1. Fetch elevation
      const elevationData: ElevationData = await fetchElevation(selection.bounds, 12)
      setStatusMsg('Buscando features geográficas...')

      // 2. Fetch features (can run in parallel with nothing else)
      const features = await fetchFeatures(selection.bounds)
      setStatusMsg('Gerando grid hexagonal...')

      // 3. Generate hex grid
      const grid = generateHexGrid(selection.bounds, elevationData, features, 7)

      setHexGrid(grid)
      setCellCount(grid.cells.length)
      setPipelineState('ready')
      setStatusMsg(`${grid.cells.length} hexágonos gerados`)
    } catch (err) {
      console.error('Pipeline error:', err)
      setPipelineState('error')
      setStatusMsg(`Erro: ${err instanceof Error ? err.message : 'desconhecido'}`)
    }
  }, [])

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="border-b px-6 py-3 flex items-center justify-between shrink-0 z-10">
        <div>
          <h1 className="text-xl font-bold">🗺️ POC — Mapa Hexagonal</h1>
          <p className="text-muted-foreground text-xs">
            Selecione uma região para converter em grid hexagonal
          </p>
        </div>
        <div className="text-right">
          {pipelineState === 'loading' && (
            <div className="text-sm text-yellow-500 animate-pulse">{statusMsg}</div>
          )}
          {pipelineState === 'ready' && (
            <div className="text-sm text-green-500">
              ✅ {cellCount} hexágonos (resolução h3: 7)
            </div>
          )}
          {pipelineState === 'error' && (
            <div className="text-sm text-red-500">❌ {statusMsg}</div>
          )}
        </div>
      </header>

      <main className="flex-1 relative">
        <MapRegionSelector
          onConfirm={handleConfirm}
          onMapLoad={setMapRef}
        />
        {mapRef && <HexGridPreview map={mapRef} grid={hexGrid} />}
      </main>
    </div>
  )
}

export default App
