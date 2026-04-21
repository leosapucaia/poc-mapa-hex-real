import type { IElevationService, PipelineExecutionInput } from '../contracts/pipeline'
import type { ElevationData } from '../../lib/elevation'
import { fetchElevation } from '../../lib/elevation'
import { TerrariumTileProvider } from '../../infra/tile-provider/TerrariumTileProvider'

export class ElevationService implements IElevationService {
  private readonly tileProvider: TerrariumTileProvider

  constructor(tileProvider: TerrariumTileProvider = new TerrariumTileProvider()) {
    this.tileProvider = tileProvider
  }

  async fetch(input: PipelineExecutionInput, zoom: number): Promise<ElevationData> {
    const probeUrl = this.tileProvider.getTileUrl(0, 0, zoom)
    if (!probeUrl.startsWith('http')) {
      throw new Error('Tile provider inválido')
    }

    return fetchElevation(input.selection.bounds, zoom, input.signal)
  }
}
