import type { RegionSelection } from '../../lib/types'
import type { ElevationData } from '../../lib/elevation'
import type { GeoFeature } from '../../lib/features'
import type { HexGrid } from '../../lib/hex-grid'

export type PipelineState = 'idle' | 'loading' | 'ready' | 'error'

export interface PipelineConfig {
  elevationZoom: number
  hexResolution: number
  retries: number
  retryDelayMs: number
}

export interface PipelineResult {
  grid: HexGrid
  features: GeoFeature[]
  elevationData: ElevationData
}

export interface PipelineStepStatus {
  message: string
  step: 'elevation' | 'features' | 'hex-grid'
}

export interface PipelineExecutionInput {
  selection: RegionSelection
  signal: AbortSignal
}

export interface IElevationService {
  fetch(input: PipelineExecutionInput, zoom: number): Promise<ElevationData>
}

export interface IFeatureService {
  fetch(input: PipelineExecutionInput): Promise<GeoFeature[]>
}

export interface IHexGridService {
  generate(selection: RegionSelection, elevationData: ElevationData, features: GeoFeature[]): HexGrid
}
