import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// MapLibre needs WebGL — mock the entire module for jsdom
vi.mock('maplibre-gl', () => {
  const mockFn = () => vi.fn()
  return {
    default: {
      Map: class {
        on = mockFn()
        remove = mockFn()
        addControl = mockFn()
        addSource = mockFn()
        addLayer = mockFn()
        getSource = mockFn()
        getCanvas = mockFn()
      },
      NavigationControl: class {},
    },
  }
})

import App from '../App'

describe('App', () => {
  it('renders the heading', () => {
    render(<App />)
    expect(screen.getByText('🗺️ POC — Mapa Hexagonal')).toBeInTheDocument()
  })

  it('renders the map instruction', () => {
    render(<App />)
    expect(screen.getByText(/Clique e arraste/)).toBeInTheDocument()
  })
})
