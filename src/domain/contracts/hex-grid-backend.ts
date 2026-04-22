import type { BoundingBox } from '../../lib/types'
import type { HexGrid } from '../../lib/hex-grid'

export interface HexGridBackendOptions {
  includeFeatures?: boolean
  includeElevation?: boolean
  requestId?: string
}

export interface HexGridBackendRequestPayload {
  bbox: BoundingBox
  resolution: number
  options?: HexGridBackendOptions
}

export interface HexGridBackendMeta {
  requestId?: string
  cache: {
    key: string
    hit: boolean
    ttlSeconds: number
  }
  metrics: {
    serverLatencyMs: number
  }
}

export interface HexGridBackendResponseV1 {
  version: 'v1'
  generatedAt: string
  grid: HexGrid
  meta: HexGridBackendMeta
}

export function buildGeoCacheKey(bbox: BoundingBox, resolution: number): string {
  const swLat = bbox.sw.lat.toFixed(4)
  const swLng = bbox.sw.lng.toFixed(4)
  const neLat = bbox.ne.lat.toFixed(4)
  const neLng = bbox.ne.lng.toFixed(4)
  return `hex:v1:${resolution}:${swLat},${swLng}:${neLat},${neLng}`
}
