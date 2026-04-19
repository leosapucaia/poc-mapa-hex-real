import { describe, it, expect } from 'vitest'
import { classifyPoint } from '../lib/features'
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
})
