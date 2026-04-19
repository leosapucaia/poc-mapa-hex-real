import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { BoundingBox, RegionSelection } from '../lib/types'
import { createRegionSelection } from '../lib/geo'

interface MapRegionSelectorProps {
  onSelectionChange?: (selection: RegionSelection | null) => void
  onConfirm?: (selection: RegionSelection) => void
}

type DrawState = 'idle' | 'drawing' | 'selected'

export function MapRegionSelector({ onSelectionChange, onConfirm }: MapRegionSelectorProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const startRef = useRef<{ lng: number; lat: number } | null>(null)
  const [drawState, setDrawState] = useState<DrawState>('idle')
  const [selection, setSelection] = useState<RegionSelection | null>(null)

  const SOURCE_ID = 'selection-source'
  const FILL_LAYER_ID = 'selection-fill'
  const OUTLINE_LAYER_ID = 'selection-outline'

  const updateRectangle = useCallback(
    (map: maplibregl.Map, sw: { lng: number; lat: number }, ne: { lng: number; lat: number }) => {
      const geojson: GeoJSON.Feature<GeoJSON.Polygon> = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [sw.lng, sw.lat],
              [ne.lng, sw.lat],
              [ne.lng, ne.lat],
              [sw.lng, ne.lat],
              [sw.lng, sw.lat],
            ],
          ],
        },
      }

      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource
      if (source) {
        source.setData(geojson)
      }
    },
    []
  )

  const clearRectangle = useCallback((map: maplibregl.Map) => {
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource
    if (source) {
      source.setData({ type: 'FeatureCollection', features: [] })
    }
  }, [])

  const initLayers = useCallback((map: maplibregl.Map) => {
    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
    })

    map.addLayer({
      id: FILL_LAYER_ID,
      type: 'fill',
      source: SOURCE_ID,
      paint: {
        'fill-color': '#3b82f6',
        'fill-opacity': 0.15,
      },
    })

    map.addLayer({
      id: OUTLINE_LAYER_ID,
      type: 'line',
      source: SOURCE_ID,
      paint: {
        'line-color': '#3b82f6',
        'line-width': 2,
        'line-dasharray': [4, 2],
      },
    })
  }, [])

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          'osm-tiles': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors',
          },
        },
        layers: [
          {
            id: 'osm-tiles',
            type: 'raster',
            source: 'osm-tiles',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [-43.2, -22.9], // Rio de Janeiro
      zoom: 4,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('load', () => {
      initLayers(map)
    })

    // --- Drawing handlers ---
    map.on('mousedown', (e) => {
      if (drawState !== 'idle') return
      e.preventDefault()

      startRef.current = { lng: e.lngLat.lng, lat: e.lngLat.lat }
      setDrawState('drawing')
      setSelection(null)
      onSelectionChange?.(null)

      // Disable map pan while drawing
      map.getCanvas().style.cursor = 'crosshair'
    })

    map.on('mousemove', (e) => {
      if (drawState !== 'drawing' || !startRef.current) return

      const start = startRef.current
      const current = { lng: e.lngLat.lng, lat: e.lngLat.lat }

      const sw = {
        lng: Math.min(start.lng, current.lng),
        lat: Math.min(start.lat, current.lat),
      }
      const ne = {
        lng: Math.max(start.lng, current.lng),
        lat: Math.max(start.lat, current.lat),
      }

      updateRectangle(map, sw, ne)
    })

    map.on('mouseup', (e) => {
      if (drawState !== 'drawing' || !startRef.current) return

      const start = startRef.current
      const end = { lng: e.lngLat.lng, lat: e.lngLat.lat }

      // Need minimum drag distance (avoid accidental clicks)
      const dx = Math.abs(end.lng - start.lng)
      const dy = Math.abs(end.lat - start.lat)
      if (dx < 0.01 || dy < 0.01) {
        clearRectangle(map)
        setDrawState('idle')
        startRef.current = null
        map.getCanvas().style.cursor = ''
        return
      }

      const bounds: BoundingBox = {
        sw: { lng: Math.min(start.lng, end.lng), lat: Math.min(start.lat, end.lat) },
        ne: { lng: Math.max(start.lng, end.lng), lat: Math.max(start.lat, end.lat) },
      }

      const regionSelection = createRegionSelection(bounds)
      setSelection(regionSelection)
      setDrawState('selected')
      onSelectionChange?.(regionSelection)

      startRef.current = null
      map.getCanvas().style.cursor = ''
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleReset = () => {
    if (!mapRef.current) return
    clearRectangle(mapRef.current)
    setDrawState('idle')
    setSelection(null)
    onSelectionChange?.(null)
  }

  const handleConfirm = () => {
    if (selection && onConfirm) {
      onConfirm(selection)
    }
  }

  return (
    <div className="relative w-full h-full">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Instructions overlay */}
      {drawState === 'idle' && (
        <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border rounded-lg px-4 py-3 shadow-sm">
          <p className="text-sm font-medium">🖱️ Clique e arraste para selecionar uma região</p>
          <p className="text-xs text-muted-foreground mt-1">
            Solte o mouse para confirmar a área
          </p>
        </div>
      )}

      {/* Selection info panel */}
      {selection && (
        <div className="absolute bottom-4 left-4 right-4 bg-background/95 backdrop-blur-sm border rounded-lg p-4 shadow-lg">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2 text-sm">
              <div className="font-semibold">📍 Região Selecionada</div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground">
                <span>
                  SW: {selection.bounds.sw.lat.toFixed(4)}, {selection.bounds.sw.lng.toFixed(4)}
                </span>
                <span>
                  NE: {selection.bounds.ne.lat.toFixed(4)}, {selection.bounds.ne.lng.toFixed(4)}
                </span>
                <span>Centro: {selection.center.lat.toFixed(4)}, {selection.center.lng.toFixed(4)}</span>
                <span>
                  Tamanho: ~{Math.round(selection.sizeKm.width)}×{Math.round(selection.sizeKm.height)} km
                </span>
              </div>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={handleReset}
                className="px-3 py-1.5 text-sm border rounded-md hover:bg-accent transition-colors"
              >
                Limpar
              </button>
              <button
                onClick={handleConfirm}
                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
              >
                Confirmar →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
