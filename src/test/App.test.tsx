import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { ReactNode } from 'react'
import type { RegionSelection } from '../lib/types'

const selectionA: RegionSelection = {
  bounds: {
    sw: { lat: -10, lng: -10 },
    ne: { lat: -9, lng: -9 },
  },
  center: { lat: -9.5, lng: -9.5 },
  sizeKm: { width: 1, height: 1 },
}

const selectionB: RegionSelection = {
  bounds: {
    sw: { lat: -20, lng: -20 },
    ne: { lat: -19, lng: -19 },
  },
  center: { lat: -19.5, lng: -19.5 },
  sizeKm: { width: 1, height: 1 },
}

const mocks = vi.hoisted(() => ({
  fetchElevation: vi.fn(),
  fetchFeatures: vi.fn(),
  generateHexGrid: vi.fn(),
}))

vi.mock('maplibre-gl', () => ({
  default: {
    Map: class {},
    NavigationControl: class {},
  },
}))

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}))

vi.mock('../components/MapRegionSelector', () => ({
  MapRegionSelector: ({ onConfirm }: { onConfirm?: (selection: RegionSelection) => void }) => (
    <div>
      <p>🖱️ Clique e arraste para selecionar uma região</p>
      <button data-testid="run-a" onClick={() => onConfirm?.(selectionA)}>run A</button>
      <button data-testid="run-b" onClick={() => onConfirm?.(selectionB)}>run B</button>
    </div>
  ),
}))

vi.mock('../components/HexGridPreview', () => ({ HexGridPreview: () => null }))
vi.mock('../components/HexMap3D', () => ({ HexMap3D: () => null }))

vi.mock('../lib/elevation', () => ({ fetchElevation: mocks.fetchElevation }))
vi.mock('../lib/features', () => ({ fetchFeatures: mocks.fetchFeatures }))
vi.mock('../lib/hex-grid', () => ({ generateHexGrid: mocks.generateHexGrid }))

import App from '../App'

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the heading', () => {
    render(<App />)
    expect(screen.getByText('🗺️ POC — Mapa Hexagonal')).toBeInTheDocument()
  })

  it('renders the map instruction', () => {
    render(<App />)
    expect(screen.getByText(/Clique e arraste/)).toBeInTheDocument()
  })

  it('mantém o resultado da execução mais recente em duas execuções concorrentes', async () => {
    let firstSignal: AbortSignal | undefined

    mocks.fetchElevation.mockImplementationOnce((_, __, signal: AbortSignal) => {
      firstSignal = signal
      return new Promise((_, reject) => {
        const onAbort = () => reject(new DOMException('Aborted', 'AbortError'))
        if (signal.aborted) {
          onAbort()
          return
        }
        signal.addEventListener('abort', onAbort, { once: true })
      })
    })
    mocks.fetchElevation.mockResolvedValueOnce({ values: new Float64Array(), width: 1, height: 1, bounds: selectionB.bounds })
    mocks.fetchFeatures.mockResolvedValue([])
    mocks.generateHexGrid.mockImplementation((bounds) => ({
      cells: bounds.sw.lat === -20 ? [{ isWater: false }, { isWater: true }] : [{ isWater: false }],
    }))

    render(<App />)

    fireEvent.click(screen.getByTestId('run-a'))
    fireEvent.click(screen.getByTestId('run-b'))

    await waitFor(
      () => {
        expect(screen.getByTestId('status-ready')).toHaveTextContent('2 hexágonos')
      },
      { timeout: 3000 }
    )

    expect(firstSignal?.aborted).toBe(true)
    expect(screen.queryByTestId('status-error')).not.toBeInTheDocument()
  })

  it('ignora erro tardio de execução obsoleta sem sobrescrever status atual', async () => {
    let rejectOldFeatures: ((reason?: unknown) => void) | undefined

    mocks.fetchElevation.mockImplementation((bounds) =>
      Promise.resolve({ values: new Float64Array(), width: 1, height: 1, bounds })
    )

    mocks.fetchFeatures.mockImplementation((bounds) => {
      if (bounds.sw.lat === -10) {
        return new Promise((_, reject) => {
          rejectOldFeatures = reject
        })
      }
      return Promise.resolve([])
    })
    mocks.generateHexGrid.mockReturnValue({ cells: [{ isWater: false }, { isWater: false }, { isWater: true }] })

    render(<App />)

    fireEvent.click(screen.getByTestId('run-a'))
    fireEvent.click(screen.getByTestId('run-b'))

    await waitFor(
      () => {
        expect(screen.getByTestId('status-ready')).toHaveTextContent('3 hexágonos')
      },
      { timeout: 3000 }
    )

    rejectOldFeatures?.(new Error('falha antiga'))

    await waitFor(() => {
      expect(screen.getByTestId('status-ready')).toHaveTextContent('3 hexágonos')
    })
    expect(screen.queryByTestId('status-error')).not.toBeInTheDocument()
  })
})
