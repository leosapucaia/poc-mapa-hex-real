import { useCallback, useMemo, useRef, useState } from 'react'
import type { RegionSelection } from '../lib/types'
import type { HexGrid } from '../lib/hex-grid'
import type { PipelineConfig, PipelineState } from '../domain/contracts/pipeline'
import { ElevationService } from '../domain/services/ElevationService'
import { FeatureService } from '../domain/services/FeatureService'
import { HexGridService } from '../domain/services/HexGridService'

const DEFAULT_CONFIG: PipelineConfig = {
  elevationZoom: 12,
  hexResolution: 7,
  retries: 2,
  retryDelayMs: 500,
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function runWithRetry<T>(operation: () => Promise<T>, retries: number, retryDelayMs: number): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw error
      }
      if (attempt < retries) {
        await sleep(retryDelayMs * (attempt + 1))
      }
    }
  }

  throw lastError
}

export function usePipelineController(config?: Partial<PipelineConfig>) {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config])

  const [pipelineState, setPipelineState] = useState<PipelineState>('idle')
  const [hexGrid, setHexGrid] = useState<HexGrid | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const requestIdRef = useRef(0)
  const activeAbortRef = useRef<AbortController | null>(null)
  const elevationServiceRef = useRef(new ElevationService())
  const featureServiceRef = useRef(new FeatureService())
  const hexGridServiceRef = useRef(new HexGridService(mergedConfig.hexResolution))

  const cancel = useCallback(() => {
    activeAbortRef.current?.abort()
    activeAbortRef.current = null
  }, [])

  const runPipeline = useCallback(async (selection: RegionSelection) => {
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId

    activeAbortRef.current?.abort()
    const abortController = new AbortController()
    activeAbortRef.current = abortController

    const isLatestRequest = () => requestIdRef.current === requestId

    setPipelineState('loading')
    setHexGrid(null)
    setStatusMsg('Buscando dados de elevação...')

    try {
      const input = { selection, signal: abortController.signal }

      const elevationData = await runWithRetry(
        () => elevationServiceRef.current.fetch(input, mergedConfig.elevationZoom),
        mergedConfig.retries,
        mergedConfig.retryDelayMs
      )
      if (!isLatestRequest()) return

      setStatusMsg('Buscando features geográficas...')
      const features = await runWithRetry(
        () => featureServiceRef.current.fetch(input),
        mergedConfig.retries,
        mergedConfig.retryDelayMs
      )
      if (!isLatestRequest()) return

      setStatusMsg('Gerando grid hexagonal...')
      const grid = hexGridServiceRef.current.generate(selection, elevationData, features)
      if (!isLatestRequest()) return

      setHexGrid(grid)
      setPipelineState('ready')
      setStatusMsg(`${grid.cells.length} hexágonos`)
    } catch (err) {
      if (!isLatestRequest()) return
      if (err instanceof DOMException && err.name === 'AbortError') {
        return
      }
      console.error('Pipeline error:', err)
      setPipelineState('error')
      setStatusMsg(`Erro: ${err instanceof Error ? err.message : 'desconhecido'}`)
    } finally {
      if (activeAbortRef.current === abortController) {
        activeAbortRef.current = null
      }
    }
  }, [mergedConfig.elevationZoom, mergedConfig.retries, mergedConfig.retryDelayMs])

  return {
    pipelineState,
    hexGrid,
    statusMsg,
    runPipeline,
    cancel,
  }
}
