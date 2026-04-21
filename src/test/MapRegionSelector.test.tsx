import { act, render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { MapRegionSelector } from '../components/MapRegionSelector'

type EventName = 'load' | 'mousedown' | 'mousemove' | 'mouseup'
type LngLatEvent = { lngLat: { lng: number; lat: number }; preventDefault: () => void }
type MockMapInstance = { emit: (event: EventName, lng: number, lat: number) => void }

const { mapInstances } = vi.hoisted(() => ({
  mapInstances: [] as MockMapInstance[],
}))

vi.mock('maplibre-gl', () => {
  class MockMap {
  handlers: Partial<Record<EventName, Array<(event: LngLatEvent) => void>>> = {}
  sourceData = new Map<string, GeoJSON.Feature<GeoJSON.Polygon> | GeoJSON.FeatureCollection>()
  canvas = { style: { cursor: '' } }
  addControl = vi.fn()
  addLayer = vi.fn()
  remove = vi.fn()

  constructor() {
      mapInstances.push(this)
  }

  on = vi.fn((event: EventName, handler: (event: LngLatEvent) => void) => {
    const currentHandlers = this.handlers[event] ?? []
    currentHandlers.push(handler)
    this.handlers[event] = currentHandlers
    return this
  })

  off = vi.fn((event: EventName, handler: (event: LngLatEvent) => void) => {
    this.handlers[event] = (this.handlers[event] ?? []).filter((registered) => registered !== handler)
    return this
  })

  emit(event: EventName, lng: number, lat: number) {
    const mapEvent: LngLatEvent = {
      lngLat: { lng, lat },
      preventDefault: vi.fn(),
    }
    ;(this.handlers[event] ?? []).forEach((handler) => handler(mapEvent))
  }

  addSource = vi.fn((id: string, config: { data: GeoJSON.FeatureCollection }) => {
    this.sourceData.set(id, config.data)
  })

  getSource = vi.fn((id: string) => ({
    setData: (data: GeoJSON.Feature<GeoJSON.Polygon> | GeoJSON.FeatureCollection) => {
      this.sourceData.set(id, data)
    },
  }))

  getCanvas = vi.fn(() => this.canvas)
  }

  return {
    default: {
      Map: MockMap,
      NavigationControl: class {},
    },
  }
})

describe('MapRegionSelector', () => {
  it('transiciona de idle -> drawing -> selected após drag válido', async () => {
    const onSelectionChange = vi.fn()

    render(<MapRegionSelector onSelectionChange={onSelectionChange} />)

    const map = mapInstances.at(-1)
    expect(map).toBeDefined()
    act(() => {
      map!.emit('load', 0, 0)
    })

    expect(screen.getByText(/Clique e arraste/)).toBeInTheDocument()

    act(() => {
      map!.emit('mousedown', -43.2, -22.9)
    })
    await waitFor(() => expect(screen.queryByText(/Clique e arraste/)).not.toBeInTheDocument())
    expect(onSelectionChange).toHaveBeenCalledWith(null)

    act(() => {
      map!.emit('mousemove', -42.8, -22.5)
      map!.emit('mouseup', -42.8, -22.5)
    })

    await waitFor(() => expect(screen.getByText(/Região Selecionada/)).toBeInTheDocument())
    expect(onSelectionChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        bounds: expect.objectContaining({
          sw: expect.objectContaining({ lng: -43.2, lat: -22.9 }),
          ne: expect.objectContaining({ lng: -42.8, lat: -22.5 }),
        }),
      })
    )
  })

  it('retorna para idle em drag curto', async () => {
    const onSelectionChange = vi.fn()

    render(<MapRegionSelector onSelectionChange={onSelectionChange} />)

    const map = mapInstances.at(-1)
    expect(map).toBeDefined()
    act(() => {
      map!.emit('load', 0, 0)
    })

    act(() => {
      map!.emit('mousedown', -43.2, -22.9)
    })
    await waitFor(() => expect(onSelectionChange).toHaveBeenCalledWith(null))
    act(() => {
      map!.emit('mouseup', -43.195, -22.895)
    })

    await waitFor(() => expect(screen.getByText(/Clique e arraste/)).toBeInTheDocument())
    expect(screen.queryByText(/Região Selecionada/)).not.toBeInTheDocument()
    expect(onSelectionChange).toHaveBeenCalledTimes(1)
    expect(onSelectionChange).toHaveBeenCalledWith(null)
  })
})
