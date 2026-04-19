import type { BoundingBox, RegionSelection } from './types'

/**
 * Calculate approximate size in km from a bounding box.
 * Uses Haversine-like approximation (good enough for mid-latitudes).
 */
export function calculateRegionSize(bounds: BoundingBox): { width: number; height: number } {
  const { sw, ne } = bounds

  // 1 degree latitude ≈ 111 km
  const heightKm = (ne.lat - sw.lat) * 111

  // 1 degree longitude varies by latitude
  const avgLat = (sw.lat + ne.lat) / 2
  const latRad = (avgLat * Math.PI) / 180
  const widthKm = (ne.lng - sw.lng) * 111 * Math.cos(latRad)

  return { width: Math.abs(widthKm), height: Math.abs(heightKm) }
}

export function createRegionSelection(bounds: BoundingBox): RegionSelection {
  const center = {
    lat: (bounds.sw.lat + bounds.ne.lat) / 2,
    lng: (bounds.sw.lng + bounds.ne.lng) / 2,
  }

  return {
    bounds,
    center,
    sizeKm: calculateRegionSize(bounds),
  }
}
