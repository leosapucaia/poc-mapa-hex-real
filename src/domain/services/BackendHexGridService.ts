import type { RegionSelection } from '../../lib/types'
import type { HexGrid } from '../../lib/hex-grid'
import { buildGeoCacheKey, type HexGridBackendRequestPayload, type HexGridBackendResponseV1 } from '../contracts/hex-grid-backend'

export interface BackendHexGridServiceConfig {
  endpoint: string
  timeoutMs: number
}

const DEFAULT_CONFIG: BackendHexGridServiceConfig = {
  endpoint: '/api/hex-grid',
  timeoutMs: 8000,
}

export class BackendHexGridService {
  private readonly config: BackendHexGridServiceConfig

  constructor(config?: Partial<BackendHexGridServiceConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
    }
  }

  async fetchGrid(selection: RegionSelection, resolution: number, signal?: AbortSignal): Promise<HexGrid> {
    const payload: HexGridBackendRequestPayload = {
      bbox: selection.bounds,
      resolution,
      options: {
        includeElevation: true,
        includeFeatures: true,
      },
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)

    const mergedSignal = controller.signal
    if (signal) {
      if (signal.aborted) {
        controller.abort()
      } else {
        signal.addEventListener('abort', () => controller.abort(), { once: true })
      }
    }

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-geo-cache-key': buildGeoCacheKey(selection.bounds, resolution),
        },
        body: JSON.stringify(payload),
        signal: mergedSignal,
      })

      if (!response.ok) {
        throw new Error(`Backend hex-grid error: ${response.status}`)
      }

      const data = await response.json() as HexGridBackendResponseV1

      if (data.version !== 'v1' || !data.grid) {
        throw new Error('Resposta do backend hex-grid inválida')
      }

      return data.grid
    } finally {
      clearTimeout(timeout)
    }
  }
}
