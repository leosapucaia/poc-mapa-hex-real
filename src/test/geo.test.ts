import { describe, it, expect } from 'vitest'
import { calculateRegionSize, createRegionSelection } from '../lib/geo'
import type { BoundingBox } from '../lib/types'

describe('calculateRegionSize', () => {
  it('calculates approximate size for a small region near equator', () => {
    const bounds: BoundingBox = {
      sw: { lat: -1, lng: -1 },
      ne: { lat: 1, lng: 1 },
    }
    const size = calculateRegionSize(bounds)
    // 2 degrees lat ≈ 222 km, 2 degrees lon at equator ≈ 222 km
    expect(size.width).toBeCloseTo(222, 0)
    expect(size.height).toBeCloseTo(222, 0)
  })

  it('accounts for latitude compression at higher latitudes', () => {
    const boundsEquator: BoundingBox = {
      sw: { lat: -1, lng: -1 },
      ne: { lat: 1, lng: 1 },
    }
    const boundsHighLat: BoundingBox = {
      sw: { lat: 59, lng: -1 },
      ne: { lat: 61, lng: 1 },
    }

    const equator = calculateRegionSize(boundsEquator)
    const highLat = calculateRegionSize(boundsHighLat)

    // Same degree span, but high latitude should be narrower in km
    expect(highLat.width).toBeLessThan(equator.width)
    // Height should be same (1 degree lat ≈ 111 km always)
    expect(highLat.height).toBeCloseTo(equator.height, 0)
  })
})

describe('createRegionSelection', () => {
  it('calculates center and size', () => {
    const bounds: BoundingBox = {
      sw: { lat: -23, lng: -47 },
      ne: { lat: -22, lng: -46 },
    }
    const selection = createRegionSelection(bounds)

    expect(selection.center.lat).toBeCloseTo(-22.5, 1)
    expect(selection.center.lng).toBeCloseTo(-46.5, 1)
    expect(selection.bounds).toEqual(bounds)
    expect(selection.sizeKm.width).toBeGreaterThan(0)
    expect(selection.sizeKm.height).toBeGreaterThan(0)
  })
})
