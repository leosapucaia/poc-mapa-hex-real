import type { IHexGridService } from '../contracts/pipeline'
import type { RegionSelection } from '../../lib/types'
import type { ElevationData } from '../../lib/elevation'
import type { GeoFeature } from '../../lib/features'
import type { HexGrid } from '../../lib/hex-grid'
import { generateHexGrid } from '../../lib/hex-grid'

export class HexGridService implements IHexGridService {
  private readonly resolution: number

  constructor(resolution: number = 7) {
    this.resolution = resolution
  }

  generate(selection: RegionSelection, elevationData: ElevationData, features: GeoFeature[]): HexGrid {
    return generateHexGrid(selection.bounds, elevationData, features, this.resolution)
  }
}
