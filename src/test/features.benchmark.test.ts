import { describe, expect, it } from 'vitest'
import { buildSpatialFeatureIndex, classifyPoint, type GeoFeature } from '../lib/features'

function createSquareFeature(id: number, centerLat: number, centerLng: number, size: number): GeoFeature {
  const half = size / 2
  return {
    id,
    category: id % 2 === 0 ? 'forest' : 'urban',
    tags: {},
    geometry: {
      type: 'Polygon',
      coordinates: [[
        [centerLng - half, centerLat - half],
        [centerLng + half, centerLat - half],
        [centerLng + half, centerLat + half],
        [centerLng - half, centerLat + half],
        [centerLng - half, centerLat - half],
      ]],
    },
  }
}

describe('feature spatial index benchmark', () => {
  it('compares linear scan vs spatial index for medium-sized areas', () => {
    const features: GeoFeature[] = []
    const size = 0.01

    for (let i = 0; i < 35; i++) {
      for (let j = 0; j < 35; j++) {
        features.push(createSquareFeature(features.length + 1, i * 0.02, j * 0.02, size))
      }
    }

    const points = Array.from({ length: 8000 }, (_, i) => {
      const lat = (i % 90) * 0.008
      const lng = ((i * 7) % 90) * 0.008
      return { lat, lng }
    })

    const t0 = performance.now()
    const linear = points.map(({ lat, lng }) => classifyPoint(lat, lng, features))
    const linearMs = performance.now() - t0

    const index = buildSpatialFeatureIndex(features)

    const t1 = performance.now()
    const indexed = points.map(({ lat, lng }) => classifyPoint(lat, lng, index))
    const indexedMs = performance.now() - t1

    expect(indexed).toEqual(linear)

    console.info(
      `[benchmark] classifyPoint linear=${linearMs.toFixed(2)}ms indexed=${indexedMs.toFixed(2)}ms features=${features.length} points=${points.length}`
    )
  })
})
