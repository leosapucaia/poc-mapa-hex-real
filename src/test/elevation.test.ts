import { describe, it, expect, vi } from 'vitest'
import { fetchElevation, runWithConcurrencyLimit, sampleElevation } from '../lib/elevation'
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

describe('runWithConcurrencyLimit', () => {
  it('limits concurrent workers to provided limit', async () => {
    const concurrencyLimit = 3
    const totalTasks = 10

    let inFlight = 0
    let maxInFlight = 0

    const tasks = Array.from({ length: totalTasks }, () => async () => {
      inFlight += 1
      maxInFlight = Math.max(maxInFlight, inFlight)
      await new Promise((resolve) => setTimeout(resolve, 5))
      inFlight -= 1
    })

    await runWithConcurrencyLimit(tasks, concurrencyLimit)

    expect(maxInFlight).toBeLessThanOrEqual(concurrencyLimit)
  })

  it('throws when limit is lower than 1', async () => {
    await expect(runWithConcurrencyLimit([], 0)).rejects.toThrow(
      'concurrencyLimit must be at least 1'
    )
  })
})

describe('fetchElevation signal handling', () => {
  it('forwards AbortSignal to fetch and handles abort as expected cancellation', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new DOMException('Aborted', 'AbortError'))

    const signal = AbortSignal.abort()
    const bounds: BoundingBox = {
      sw: { lat: 0, lng: 0 },
      ne: { lat: 0.01, lng: 0.01 },
    }

    const data = await fetchElevation(bounds, 12, signal)

    expect(fetchSpy).toHaveBeenCalled()
    const secondArg = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect(secondArg.signal).toBe(signal)
    expect(data.width).toBeGreaterThan(0)
    expect(data.height).toBeGreaterThan(0)

    fetchSpy.mockRestore()
  })
})
