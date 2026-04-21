import { useState, useCallback, Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import maplibregl from 'maplibre-gl'
import { MapRegionSelector } from './components/MapRegionSelector'
import { HexGridPreview } from './components/HexGridPreview'
import { HexMap3D } from './components/HexMap3D'
import type { RegionSelection } from './lib/types'
import type { HexGrid } from './lib/hex-grid'

type PipelineState = 'idle' | 'loading' | 'ready' | 'error'
type ViewMode = '2d' | '3d'

// Pre-set demo region: Rio de Janeiro (small area for fast loading)
const DEMO_REGION: RegionSelection = {
  bounds: {
    sw: { lat: -23.05, lng: -43.75 },
    ne: { lat: -22.80, lng: -43.10 },
  },
  center: { lat: -22.925, lng: -43.425 },
  sizeKm: { width: 65, height: 28 },
}

function App() {
  const [pipelineState, setPipelineState] = useState<PipelineState>('idle')
  const [viewMode, setViewMode] = useState<ViewMode>('2d')
  const [hexGrid, setHexGrid] = useState<HexGrid | null>(null)
  const [mapRef, setMapRef] = useState<maplibregl.Map | null>(null)
  const [statusMsg, setStatusMsg] = useState('')
  const requestIdRef = useRef(0)
  const activeAbortRef = useRef<AbortController | null>(null)

  const runPipeline = useCallback(async (selection: RegionSelection) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    activeAbortRef.current?.abort()
    const abortController = new AbortController()
    activeAbortRef.current = abortController

    const isLatestRequest = () => requestIdRef.current === requestId

    setPipelineState('loading')
    setHexGrid(null)
    setStatusMsg('Buscando dados de elevação...')

    try {
      const { fetchElevation } = await import('./lib/elevation')
      const { fetchFeatures } = await import('./lib/features')
      const { generateHexGrid } = await import('./lib/hex-grid')

      const elevationData = await fetchElevation(selection.bounds, 12, abortController.signal)
      if (!isLatestRequest()) return
      setStatusMsg('Buscando features geográficas...')

      const features = await fetchFeatures(selection.bounds, abortController.signal)
      if (!isLatestRequest()) return
      setStatusMsg('Gerando grid hexagonal...')

      const grid = generateHexGrid(selection.bounds, elevationData, features, 7)
      if (!isLatestRequest()) return

      setHexGrid(grid)
      setPipelineState('ready')
      setStatusMsg(`${grid.cells.length} hexágonos`)
    } catch (err) {
      if (!isLatestRequest()) return
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      console.error('Pipeline error:', err)
      setPipelineState('error')
      setStatusMsg(`Erro: ${err instanceof Error ? err.message : 'desconhecido'}`)
    } finally {
      if (activeAbortRef.current === abortController) {
        activeAbortRef.current = null
      }
    }
  }, [])

  const handleDemo = useCallback(() => {
    runPipeline(DEMO_REGION)
  }, [runPipeline])

  const terrainCount = hexGrid?.cells.filter((c) => !c.isWater).length ?? 0
  const waterCount = hexGrid?.cells.filter((c) => c.isWater).length ?? 0

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      <header className="border-b px-6 py-3 flex items-center justify-between shrink-0 z-10">
        <div>
          <h1 className="text-xl font-bold">🗺️ POC — Mapa Hexagonal</h1>
          <p className="text-muted-foreground text-xs">
            Selecione uma região para converter em grid hexagonal
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Demo button */}
          {pipelineState !== 'loading' && (
            <button
              onClick={handleDemo}
              data-testid="demo-button"
              className="px-3 py-1.5 text-sm border border-dashed rounded-md hover:bg-accent transition-colors text-muted-foreground"
            >
              ⚡ Demo (Rio de Janeiro)
            </button>
          )}

          {/* Pipeline status */}
          {pipelineState === 'loading' && (
            <div className="text-sm text-yellow-500 animate-pulse" data-testid="status-loading">
              {statusMsg}
            </div>
          )}
          {pipelineState === 'ready' && (
            <div className="text-sm text-green-500" data-testid="status-ready">
              ✅ {hexGrid?.cells.length} hexágonos · {terrainCount} terra · {waterCount} água
            </div>
          )}
          {pipelineState === 'error' && (
            <div className="text-sm text-red-500" data-testid="status-error">
              ❌ {statusMsg}
            </div>
          )}

          {/* View toggle */}
          {pipelineState === 'ready' && (
            <div className="flex border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('2d')}
                data-testid="view-2d"
                className={`px-3 py-1 text-sm transition-colors ${
                  viewMode === '2d'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
                }`}
              >
                2D Map
              </button>
              <button
                onClick={() => setViewMode('3d')}
                data-testid="view-3d"
                className={`px-3 py-1 text-sm transition-colors ${
                  viewMode === '3d'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background hover:bg-accent'
                }`}
              >
                3D View
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 relative">
        {/* 2D Map (always mounted, hidden when 3D active) */}
        <div className={viewMode === '2d' ? 'absolute inset-0' : 'hidden'}>
          <MapRegionSelector onConfirm={runPipeline} onMapLoad={setMapRef} />
          {mapRef && <HexGridPreview map={mapRef} grid={hexGrid} />}
        </div>

        {/* 3D View */}
        {viewMode === '3d' && hexGrid && (
          <div className="absolute inset-0 bg-slate-900">
            <Canvas
              camera={{ position: [0, 50, 50], fov: 50 }}
              gl={{ antialias: true }}
            >
              <Suspense fallback={null}>
                <HexMap3D grid={hexGrid} />
              </Suspense>
            </Canvas>
            <div className="absolute bottom-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg px-4 py-2 text-xs text-muted-foreground">
              🖱️ Orbit: arrastar · Zoom: scroll · Pan: botão direito
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
