import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import type { HexGrid } from '../lib/hex-grid'

interface HexGridPreviewProps {
  map: maplibregl.Map
  grid: HexGrid | null
}

const TERRAIN_COLORS: Record<string, string> = {
  water: '#3b82f6',
  forest: '#22c55e',
  urban: '#a855f7',
  farmland: '#eab308',
  road: '#6b7280',
  other: '#94a3b8',
}

export function HexGridPreview({ map, grid }: HexGridPreviewProps) {
  const SOURCE_ID = 'hex-grid-source'
  const LAYER_ID = 'hex-grid-fill'
  const OUTLINE_ID = 'hex-grid-outline'
  const isMounted = useRef(true)

  const createGeoJson = (nextGrid: HexGrid): GeoJSON.FeatureCollection<GeoJSON.Polygon> => ({
    type: 'FeatureCollection',
    features: nextGrid.cells.map((cell) => ({
      type: 'Feature',
      properties: {
        elevation: cell.elevation,
        terrain: cell.terrain,
        isWater: cell.isWater,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [...cell.boundary.map((b) => [b.lng, b.lat] as [number, number]), [cell.boundary[0].lng, cell.boundary[0].lat]],
        ],
      },
    })),
  })

  useEffect(() => {
    const ensureSourceAndLayers = () => {
      if (!isMounted.current) return
      if (map.getSource(SOURCE_ID)) return

      map.addSource(SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })

      map.addLayer({
        id: LAYER_ID,
        type: 'fill',
        source: SOURCE_ID,
        paint: {
          'fill-color': [
            'match',
            ['get', 'terrain'],
            'water', TERRAIN_COLORS.water,
            'forest', TERRAIN_COLORS.forest,
            'urban', TERRAIN_COLORS.urban,
            'farmland', TERRAIN_COLORS.farmland,
            'road', TERRAIN_COLORS.road,
            TERRAIN_COLORS.other,
          ],
          'fill-opacity': 0.6,
        },
      })

      map.addLayer({
        id: OUTLINE_ID,
        type: 'line',
        source: SOURCE_ID,
        paint: {
          'line-color': '#1e293b',
          'line-width': 0.5,
        },
      })
    }

    isMounted.current = true
    if (map.isStyleLoaded()) {
      ensureSourceAndLayers()
    } else {
      map.on('load', ensureSourceAndLayers)
      map.on('style.load', ensureSourceAndLayers)
    }

    return () => {
      isMounted.current = false
      map.off('load', ensureSourceAndLayers)
      map.off('style.load', ensureSourceAndLayers)
      if (map.getLayer(LAYER_ID)) map.removeLayer(LAYER_ID)
      if (map.getLayer(OUTLINE_ID)) map.removeLayer(OUTLINE_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map])

  useEffect(() => {
    if (!grid) return
    const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined
    if (!source) return

    source.setData(createGeoJson(grid))
  }, [grid, map])

  return null // MapLibre handles the rendering
}
