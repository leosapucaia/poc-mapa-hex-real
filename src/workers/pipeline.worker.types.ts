import type { RegionSelection } from '../lib/types'
import type { ElevationData } from '../lib/elevation'
import type { GeoFeature } from '../lib/features'
import type { HexGridProgress, HexGrid } from '../lib/hex-grid'

export interface WorkerRequestPayload {
  selection: RegionSelection
  elevationData: ElevationData
  features: GeoFeature[]
  hexResolution: number
}

export interface WorkerResponsePayload {
  grid: HexGrid
}

export type WorkerRequestMessage = {
  type: 'request'
  requestId: string
  payload: WorkerRequestPayload
}

export type WorkerProgressMessage = {
  type: 'progress'
  requestId: string
  payload: HexGridProgress
}

export type WorkerSuccessMessage = {
  type: 'response'
  requestId: string
  payload: WorkerResponsePayload
}

export type WorkerErrorMessage = {
  type: 'error'
  requestId: string
  error: string
}

export type WorkerResponseMessage = WorkerProgressMessage | WorkerSuccessMessage | WorkerErrorMessage
