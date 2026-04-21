import type { BoundingBox } from './types'

export type TerrainCategory = 'water' | 'forest' | 'urban' | 'farmland' | 'road' | 'other'

export interface GeoFeature {
  id: number
  geometry: GeoJSON.Geometry
  category: TerrainCategory
  /** OSM tags */
  tags: Record<string, string>
}

/**
 * Fetch geographic features from Overpass API (OpenStreetMap).
 * Free, no API key required.
 */
export async function fetchFeatures(bounds: BoundingBox, signal?: AbortSignal): Promise<GeoFeature[]> {
  const { sw, ne } = bounds
  const bbox = `${sw.lat},${sw.lng},${ne.lat},${ne.lng}`

  // Query water, land use, natural features, and major roads
  const query = `
    [out:json][timeout:30][bbox:${bbox}];
    (
      way["natural"="water"];
      way["waterway"="riverbank"];
      way["water"];
      relation["natural"="water"];
      way["landuse"="forest"];
      way["natural"="wood"];
      way["landuse"="residential"];
      way["landuse"="commercial"];
      way["landuse"="industrial"];
      way["landuse"="farmland"];
      way["landuse"="farmyard"];
      way["highway"="motorway"];
      way["highway"="trunk"];
      way["highway"="primary"];
    );
    out geom;
  `

  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`

  try {
    const response = await fetch(url, { signal })
    if (!response.ok) {
      console.warn('Overpass API error:', response.status)
      return []
    }

    const data = await response.json()
    return (data.elements || []).map(parseElement).filter(Boolean) as GeoFeature[]
  } catch (err) {
    console.warn('Overpass API fetch failed:', err)
    return []
  }
}

/**
 * Classify a point (lat, lng) based on features.
 * Returns the most specific category, or 'other'.
 */
export function classifyPoint(
  lat: number,
  lng: number,
  features: GeoFeature[]
): TerrainCategory {
  // Check in priority order (most specific first)
  for (const feature of features) {
    if (pointInGeometry(lat, lng, feature.geometry)) {
      return feature.category
    }
  }
  return 'other'
}

// --- Parsers ---

function parseElement(el: Record<string, unknown>): GeoFeature | null {
  const tags = (el.tags || {}) as Record<string, string>
  const category = classifyTags(tags)

  // Convert OSM geometry to GeoJSON
  let geometry: GeoJSON.Geometry | null = null

  if (el.type === 'way' && Array.isArray(el.geometry)) {
    const coords = (el.geometry as Record<string, number>[]).map((n) => [n.lon, n.lat])
    if (coords.length >= 4 && coords[0][0] === coords[coords.length - 1][0] && coords[0][1] === coords[coords.length - 1][1]) {
      geometry = { type: 'Polygon', coordinates: [coords as [number, number][]] }
    } else {
      geometry = { type: 'LineString', coordinates: coords as [number, number][] }
    }
  } else if (el.type === 'relation' && Array.isArray(el.members)) {
    // Simple relation handling — take outer members
    const outerRings = (el.members as Record<string, unknown>[])
      .filter((m) => m.role === 'outer' && m.geometry)
      .map((m) =>
        ((m.geometry as Record<string, number>[]).map((n) => [n.lon, n.lat]) as [number, number][])
      )
    if (outerRings.length > 0) {
      geometry = { type: 'Polygon', coordinates: outerRings }
    }
  }

  if (!geometry) return null

  return {
    id: el.id as number,
    geometry,
    category,
    tags,
  }
}

function classifyTags(tags: Record<string, string>): TerrainCategory {
  // Water
  if (tags.natural === 'water' || tags.waterway === 'riverbank' || tags.water) {
    return 'water'
  }
  // Forest
  if (tags.landuse === 'forest' || tags.natural === 'wood') {
    return 'forest'
  }
  // Urban
  if (['residential', 'commercial', 'industrial'].includes(tags.landuse || '')) {
    return 'urban'
  }
  // Farmland
  if (['farmland', 'farmyard'].includes(tags.landuse || '')) {
    return 'farmland'
  }
  // Road
  if (tags.highway) {
    return 'road'
  }
  return 'other'
}

/**
 * Simple point-in-polygon check for GeoJSON geometries.
 * Works for Polygon and checks bounding box for LineString.
 */
function pointInGeometry(lat: number, lng: number, geometry: GeoJSON.Geometry): boolean {
  if (geometry.type === 'Polygon') {
    const ring = geometry.coordinates[0]
    return pointInPolygon(lat, lng, ring)
  }
  if (geometry.type === 'LineString') {
    // Check if point is near the line (within ~50m)
    for (let i = 0; i < geometry.coordinates.length - 1; i++) {
      const [x1, y1] = geometry.coordinates[i]
      const [x2, y2] = geometry.coordinates[i + 1]
      const dist = pointToSegmentDistance(lat, lng, y1, x1, y2, x2)
      if (dist < 0.0005) return true // ~50m
    }
  }
  return false
}

function pointInPolygon(lat: number, lng: number, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

function pointToSegmentDistance(
  px: number, py: number,
  x1: number, y1: number,
  x2: number, y2: number
): number {
  const dx = x2 - x1, dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy))
}
