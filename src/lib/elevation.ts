import type { BoundingBox } from './types'

const DEFAULT_TILE_FETCH_CONCURRENCY = 8

/** Elevation data as a 2D grid */
export interface ElevationData {
  /** Grid dimensions */
  width: number
  height: number
  /** Elevation in meters, row-major [y][x] */
  values: Float64Array
  /** Bounding box this grid covers */
  bounds: BoundingBox
}

/**
 * Fetch elevation data from AWS Open Data Terrain Tiles (Terrarium encoding).
 * Free, global, no API key required.
 * Resolution: ~30m at zoom 14, ~480m at zoom 10.
 *
 * Encoding: elevation = (R * 256 + G + B / 256) - 32768
 */
export async function fetchElevation(
  bounds: BoundingBox,
  zoom: number = 12,
  signal?: AbortSignal
): Promise<ElevationData> {
  const { sw, ne } = bounds

  // Convert lat/lng to tile coordinates
  const tileSW = latLngToTile(sw.lat, sw.lng, zoom)
  const tileNE = latLngToTile(ne.lat, ne.lng, zoom)

  const minTileX = Math.min(tileSW.x, tileNE.x)
  const maxTileX = Math.max(tileSW.x, tileNE.x)
  const minTileY = Math.min(tileSW.y, tileNE.y)
  const maxTileY = Math.max(tileSW.y, tileNE.y)

  const tileSize = 256
  const gridWidth = (maxTileX - minTileX + 1) * tileSize
  const gridHeight = (maxTileY - minTileY + 1) * tileSize
  const values = new Float64Array(gridWidth * gridHeight)

  // Fetch tiles with bounded parallelism
  const tasks: Array<() => Promise<void>> = []
  for (let ty = minTileY; ty <= maxTileY; ty++) {
    for (let tx = minTileX; tx <= maxTileX; tx++) {
      tasks.push(async () => {
        const pixels = await fetchTile(tx, ty, zoom, tileSize, signal)
          if (!pixels) return
          const offsetX = (tx - minTileX) * tileSize
          const offsetY = (ty - minTileY) * tileSize
          for (let py = 0; py < tileSize; py++) {
            for (let px = 0; px < tileSize; px++) {
              const srcIdx = (py * tileSize + px) * 4
              const r = pixels[srcIdx]
              const g = pixels[srcIdx + 1]
              const b = pixels[srcIdx + 2]
              const elevation = r * 256 + g + b / 256 - 32768
              const dstIdx = (offsetY + py) * gridWidth + (offsetX + px)
              values[dstIdx] = elevation
            }
          }
      })
    }
  }

  await runWithConcurrencyLimit(tasks, DEFAULT_TILE_FETCH_CONCURRENCY)

  return { width: gridWidth, height: gridHeight, values, bounds }
}

/**
 * Sample elevation at a specific lat/lng from elevation grid.
 * Uses bilinear interpolation for smooth values.
 */
export function sampleElevation(
  data: ElevationData,
  lat: number,
  lng: number
): number {
  const { sw, ne } = data.bounds

  // Normalize lat/lng to grid coordinates
  const nx = ((lng - sw.lng) / (ne.lng - sw.lng)) * (data.width - 1)
  const ny = ((ne.lat - lat) / (ne.lat - sw.lat)) * (data.height - 1)

  // Bilinear interpolation
  const x0 = Math.floor(nx)
  const y0 = Math.floor(ny)
  const x1 = Math.min(x0 + 1, data.width - 1)
  const y1 = Math.min(y0 + 1, data.height - 1)
  const fx = nx - x0
  const fy = ny - y0

  const v00 = data.values[y0 * data.width + x0]
  const v10 = data.values[y0 * data.width + x1]
  const v01 = data.values[y1 * data.width + x0]
  const v11 = data.values[y1 * data.width + x1]

  return v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy
}

// --- Helpers ---

function latLngToTile(lat: number, lng: number, zoom: number) {
  const n = Math.pow(2, zoom)
  const x = Math.floor(((lng + 180) / 360) * n)
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  )
  return { x, y }
}

export async function runWithConcurrencyLimit(
  tasks: Array<() => Promise<void>>,
  concurrencyLimit: number
): Promise<void> {
  if (concurrencyLimit < 1) {
    throw new Error('concurrencyLimit must be at least 1')
  }

  let nextTaskIndex = 0

  async function worker() {
    while (nextTaskIndex < tasks.length) {
      const taskIndex = nextTaskIndex
      nextTaskIndex += 1
      await tasks[taskIndex]()
    }
  }

  const workerCount = Math.min(concurrencyLimit, tasks.length)
  const workers = Array.from({ length: workerCount }, () => worker())
  await Promise.all(workers)
}

async function fetchTile(
  x: number,
  y: number,
  z: number,
  tileSize: number,
  signal?: AbortSignal
): Promise<Uint8ClampedArray | null> {
  // AWS Open Data Terrain Tiles — Terrarium encoding, free, no key
  const url = `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/${z}/${x}/${y}.png`

  try {
    const response = await fetch(url, { signal })
    if (!response.ok) return null

    const blob = await response.blob()
    const bitmap = await createImageBitmap(blob)

    const canvas = new OffscreenCanvas(tileSize, tileSize)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(bitmap, 0, 0)
    bitmap.close()

    return ctx.getImageData(0, 0, tileSize, tileSize).data
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return null
    }
    return null
  }
}
