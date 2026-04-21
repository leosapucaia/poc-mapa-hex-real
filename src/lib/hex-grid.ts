import { cellToBoundary, latLngToCell, gridDisk } from 'h3-js'
import type { BoundingBox } from './types'
import type { ElevationData } from './elevation'
import { sampleElevation } from './elevation'
import type { GeoFeature, TerrainCategory } from './features'
import { buildSpatialFeatureIndex, classifyPoint } from './features'

export interface HexCell {
  /** H3 index */
  h3Index: string
  /** Center coordinates */
  center: { lat: number; lng: number }
  /** Boundary vertices [{lat, lng}, ...] */
  boundary: { lat: number; lng: number }[]
  /** Elevation in meters */
  elevation: number
  /** Terrain classification */
  terrain: TerrainCategory
  /** Is this cell water? */
  isWater: boolean
}

export interface HexGrid {
  cells: HexCell[]
  resolution: number
  bounds: BoundingBox
}

export interface HexGridProgress {
  phase: 'indexing-features' | 'classifying-cells'
  processed: number
  total: number
}

/**
 * Generate a hex grid covering the given bounds using h3-js.
 * Each cell is sampled for elevation and terrain.
 */
export function generateHexGrid(
  bounds: BoundingBox,
  elevationData: ElevationData,
  features: GeoFeature[],
  resolution: number = 7,
  onProgress?: (progress: HexGridProgress) => void
): HexGrid {
  const { sw, ne } = bounds
  const centerLat = (sw.lat + ne.lat) / 2
  const centerLng = (sw.lng + ne.lng) / 2

  // Get center H3 cell
  const centerH3 = latLngToCell(centerLat, centerLng, resolution)

  // Estimate radius in hex steps based on bounding box size
  const latSpan = ne.lat - sw.lat
  const lngSpan = ne.lng - sw.lng
  const maxSpan = Math.max(latSpan, lngSpan)
  // Rough: at resolution 7, each hex is ~5km. Convert degrees to km then to hex steps.
  const spanKm = maxSpan * 111
  const hexSizeKm = getHexSizeKm(resolution)
  const radiusKm = spanKm / 2
  const hexRadius = Math.ceil(radiusKm / hexSizeKm) + 1

  // Get all cells within radius
  const h3Indices = gridDisk(centerH3, hexRadius)

  // Build spatial index once and query candidates per cell center
  onProgress?.({ phase: 'indexing-features', processed: 0, total: features.length })
  const featureIndex = buildSpatialFeatureIndex(features)
  onProgress?.({ phase: 'indexing-features', processed: features.length, total: features.length })

  // Filter to cells within bounds and sample data
  const cells: HexCell[] = []

  for (let i = 0; i < h3Indices.length; i++) {
    const h3Index = h3Indices[i]
    const boundary = cellToBoundary(h3Index)
    const cellCenter = getCellCenter(boundary)

    // Check if center is within bounds (with small margin)
    if (
      cellCenter.lat < sw.lat - 0.01 ||
      cellCenter.lat > ne.lat + 0.01 ||
      cellCenter.lng < sw.lng - 0.01 ||
      cellCenter.lng > ne.lng + 0.01
    ) {
      continue
    }

    const elevation = sampleElevation(elevationData, cellCenter.lat, cellCenter.lng)
    const terrain = classifyPoint(cellCenter.lat, cellCenter.lng, featureIndex)
    const isWater = terrain === 'water' || elevation < 0

    cells.push({
      h3Index,
      center: cellCenter,
      boundary: boundary.map((b) => ({ lat: b[0], lng: b[1] })),
      elevation,
      terrain,
      isWater,
    })
    if ((i + 1) % 200 === 0 || i + 1 === h3Indices.length) {
      onProgress?.({
        phase: 'classifying-cells',
        processed: i + 1,
        total: h3Indices.length,
      })
    }
  }

  return { cells, resolution, bounds }
}

function getCellCenter(boundary: [number, number][]): { lat: number; lng: number } {
  let lat = 0, lng = 0
  for (const [bLat, bLng] of boundary) {
    lat += bLat
    lng += bLng
  }
  return { lat: lat / boundary.length, lng: lng / boundary.length }
}

function getHexSizeKm(resolution: number): number {
  // Approximate edge length in km for each h3 resolution
  const sizes: Record<number, number> = {
    0: 1282, 1: 483, 2: 182, 3: 68, 4: 26, 5: 9.8, 6: 3.7, 7: 1.4,
    8: 0.53, 9: 0.2, 10: 0.076, 11: 0.029, 12: 0.011, 13: 0.004, 14: 0.0016,
  }
  return sizes[resolution] ?? 1.4
}
