import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HexGridPreview } from '../components/HexGridPreview'
import type { HexGrid } from '../lib/hex-grid'

function buildGrid(seed: number): HexGrid {
  return {
    resolution: 7,
    bounds: {
      sw: { lat: -22, lng: -43 },
      ne: { lat: -21, lng: -42 },
    },
    cells: [
      {
        h3Index: `cell-${seed}`,
        center: { lat: -21.5, lng: -42.5 },
        boundary: [
          { lat: -21.51, lng: -42.51 },
          { lat: -21.49, lng: -42.51 },
          { lat: -21.48, lng: -42.49 },
          { lat: -21.49, lng: -42.47 },
          { lat: -21.51, lng: -42.47 },
          { lat: -21.52, lng: -42.49 },
        ],
        elevation: seed * 100,
        terrain: 'forest',
        isWater: false,
      },
    ],
  }
}

describe('HexGridPreview', () => {
  it('atualiza múltiplos grids sem recriar source/layers', () => {
    const source = { setData: vi.fn() }
    const layers = new Set<string>()
    let hasSource = false

    const map = {
      isStyleLoaded: vi.fn(() => true),
      on: vi.fn(),
      off: vi.fn(),
      addSource: vi.fn(() => {
        hasSource = true
      }),
      getSource: vi.fn(() => (hasSource ? source : undefined)),
      removeSource: vi.fn(() => {
        hasSource = false
      }),
      addLayer: vi.fn((layer: { id: string }) => {
        layers.add(layer.id)
      }),
      getLayer: vi.fn((id: string) => (layers.has(id) ? { id } : undefined)),
      removeLayer: vi.fn((id: string) => {
        layers.delete(id)
      }),
    }

    const { rerender, unmount } = render(<HexGridPreview map={map as never} grid={buildGrid(1)} />)
    rerender(<HexGridPreview map={map as never} grid={buildGrid(2)} />)
    rerender(<HexGridPreview map={map as never} grid={buildGrid(3)} />)

    expect(map.addSource).toHaveBeenCalledTimes(1)
    expect(map.addLayer).toHaveBeenCalledTimes(2)
    expect(source.setData).toHaveBeenCalledTimes(3)
    expect(map.removeLayer).not.toHaveBeenCalled()
    expect(map.removeSource).not.toHaveBeenCalled()

    unmount()

    expect(map.removeLayer).toHaveBeenCalledTimes(2)
    expect(map.removeSource).toHaveBeenCalledTimes(1)
  })
})
