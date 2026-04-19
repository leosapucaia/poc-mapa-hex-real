import { describe, it, expect } from 'vitest'
import { sampleElevation } from '../lib/elevation'
import type { ElevationData } from '../lib/elevation'
import type { BoundingBox } from '../lib/types'

function makeElevationData(
  width: number,
  height: number,
  values: number[],
  bounds: BoundingBox
): ElevationData {
  return { width, height, values: new Float64Array(values), bounds }
}

describe('sampleElevation', () => {
  const bounds: BoundingBox = {
    sw: { lat: 0, lng: 0 },
    ne: { lat: 1, lng: 1 },
  }

  it('returns corner value when sampling at exact grid point', () => {
    // 2x2 grid: [[100, 200], [300, 400]]
    const data = makeElevationData(2, 2, [100, 200, 300, 400], bounds)

    // Top-left (NE corner) = values[0]
    expect(sampleElevation(data, 1, 0)).toBeCloseTo(100, 0)
    // Top-right = values[1]
    expect(sampleElevation(data, 1, 1)).toBeCloseTo(200, 0)
  })

  it('interpolates between grid points', () => {
    const data = makeElevationData(2, 2, [0, 100, 200, 300], bounds)

    // Center point should be interpolated average
    const center = sampleElevation(data, 0.5, 0.5)
    expect(center).toBeCloseTo(150, 0)
  })
})
