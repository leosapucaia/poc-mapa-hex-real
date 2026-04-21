import { describe, it, expect } from 'vitest'
import { buildSpatialFeatureIndex, classifyPoint, preprocessFeatures, queryFeatureCandidates } from '../lib/features'
import type { GeoFeature } from '../lib/features'

describe('classifyPoint', () => {
  const waterFeature: GeoFeature = {
    id: 1,
    geometry: {
      type: 'Polygon',
      coordinates: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]],
    },
    category: 'water',
    tags: { natural: 'water' },
  }

  it('returns water for point inside water polygon', () => {
    expect(classifyPoint(0, 0, [waterFeature])).toBe('water')
  })

  it('returns other for point outside any feature', () => {
    expect(classifyPoint(10, 10, [waterFeature])).toBe('other')
  })

  it('returns other for empty features', () => {
    expect(classifyPoint(0, 0, [])).toBe('other')
  })

  it('classifies with spatial index', () => {
    const index = buildSpatialFeatureIndex([waterFeature], 0.5)
    expect(classifyPoint(0, 0, index)).toBe('water')
    expect(classifyPoint(10, 10, index)).toBe('other')
  })

  it('preprocesses bbox and queries candidate subset', () => {
    const processed = preprocessFeatures([waterFeature])
    expect(processed[0].bbox).toEqual({ minLat: -1, minLng: -1, maxLat: 1, maxLng: 1 })

    const index = buildSpatialFeatureIndex([waterFeature], 0.5)
    const candidatesInside = queryFeatureCandidates(0, 0, index)
    const candidatesOutside = queryFeatureCandidates(10, 10, index)

    expect(candidatesInside.length).toBe(1)
    expect(candidatesOutside.length).toBe(0)
  })
})
