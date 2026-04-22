import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RegionSelection } from '../lib/types'
import type { HexGrid } from '../lib/hex-grid'
import { generateHexGrid } from '../lib/hex-grid'
import type { PipelineConfig, PipelineState } from '../domain/contracts/pipeline'
import { ElevationService } from '../domain/services/ElevationService'
import { FeatureService } from '../domain/services/FeatureService'
import { BackendHexGridService } from '../domain/services/BackendHexGridService'
import type { WorkerRequestMessage, WorkerResponseMessage } from '../workers/pipeline.worker.types'

const DEFAULT_CONFIG: PipelineConfig = {
  elevationZoom: 12,
  hexResolution: 7,
  retries: 2,
  retryDelayMs: 500,
}

interface PipelineRuntimeMetrics {
  localLatencies: number[]
  backendLatencies: number[]
  backendErrors: number
  backendRequests: number
}

interface HybridBackendConfig {
  enabled: boolean
  endpoint: string
}

function getPercentile(values: number[], percentile: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const index = Math.min(sorted.length - 1, Math.floor((percentile / 100) * sorted.length))
  return sorted[index]
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

async function measureUiResponsiveness<T>(task: () => Promise<T>): Promise<{ result: T; fpsEstimate: number; inputLatencyMs: number }> {
  const inputMark = performance.now()
  const inputLatencyPromise = new Promise<number>((resolve) => {
    setTimeout(() => {
      resolve(performance.now() - inputMark)
    }, 0)
  })

  let frameCount = 0
  let rafId = 0
  const frameStart = performance.now()

  const tick = () => {
    frameCount += 1
    rafId = requestAnimationFrame(tick)
  }

  rafId = requestAnimationFrame(tick)
  const result = await task()
  cancelAnimationFrame(rafId)

  const elapsed = Math.max(performance.now() - frameStart, 1)
  const fpsEstimate = (frameCount * 1000) / elapsed
  const inputLatencyMs = await inputLatencyPromise

  return { result, fpsEstimate, inputLatencyMs }
}

export function usePipelineController(config?: Partial<PipelineConfig>) {
  const mergedConfig = useMemo(() => ({ ...DEFAULT_CONFIG, ...config }), [config])
  const backendMode = useMemo(
    () => config?.backendMode ?? { enabled: false, endpoint: '/api/hex-grid' },
    [config?.backendMode]
  )

  const [pipelineState, setPipelineState] = useState<PipelineState>('idle')
  const [hexGrid, setHexGrid] = useState<HexGrid | null>(null)
  const [statusMsg, setStatusMsg] = useState('')

  const requestIdRef = useRef(0)
  const activeAbortRef = useRef<AbortController | null>(null)
  const elevationServiceRef = useRef(new ElevationService())
  const featureServiceRef = useRef(new FeatureService())
  const backendServiceRef = useRef(new BackendHexGridService())
  const workerRef = useRef<Worker | null>(null)
  const hybridBackendRef = useRef<HybridBackendConfig>({
    enabled: false,
    endpoint: '/api/hex-grid',
  })
  const metricsRef = useRef<PipelineRuntimeMetrics>({
    localLatencies: [],
    backendLatencies: [],
    backendErrors: 0,
    backendRequests: 0,
  })

  useEffect(() => {
    hybridBackendRef.current = {
      enabled: backendMode.enabled,
      endpoint: backendMode.endpoint,
    }
    backendServiceRef.current = new BackendHexGridService({
      endpoint: backendMode.endpoint,
    })
  }, [backendMode.enabled, backendMode.endpoint])

  const cancel = useCallback(() => {
    activeAbortRef.current?.abort()
    activeAbortRef.current = null
  }, [])

  const runGridOnWorker = useCallback(async (
    requestId: string,
    selection: RegionSelection,
    elevationData: Parameters<typeof generateHexGrid>[1],
    features: Parameters<typeof generateHexGrid>[2]
  ): Promise<HexGrid> => {
    const worker = workerRef.current ?? new Worker(new URL('../workers/pipeline.worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker

    return new Promise<HexGrid>((resolve, reject) => {
      const onMessage = (event: MessageEvent<WorkerResponseMessage>) => {
        const message = event.data
        if (message.requestId !== requestId) return

        if (message.type === 'progress') {
          if (message.payload.phase === 'indexing-features') {
            setStatusMsg(`Worker: indexando features ${message.payload.processed}/${message.payload.total}`)
          } else {
            setStatusMsg(`Worker: classificando células ${message.payload.processed}/${message.payload.total}`)
          }
          return
        }

        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)

        if (message.type === 'error') {
          reject(new Error(message.error))
          return
        }

        resolve(message.payload.grid)
      }

      const onError = (event: ErrorEvent) => {
        worker.removeEventListener('message', onMessage)
        worker.removeEventListener('error', onError)
        reject(event.error ?? new Error(event.message))
      }

      worker.addEventListener('message', onMessage)
      worker.addEventListener('error', onError)

      const payload: WorkerRequestMessage = {
        type: 'request',
        requestId,
        payload: {
          selection,
          elevationData,
          features,
          hexResolution: mergedConfig.hexResolution,
        },
      }

      worker.postMessage(payload)
    })
  }, [mergedConfig.hexResolution])

  const runGridWithFallback = useCallback(async (
    requestId: string,
    selection: RegionSelection,
    elevationData: Parameters<typeof generateHexGrid>[1],
    features: Parameters<typeof generateHexGrid>[2]
  ): Promise<{ grid: HexGrid; mode: 'worker' | 'main' }> => {
    if (typeof Worker !== 'undefined') {
      try {
        const grid = await runGridOnWorker(requestId, selection, elevationData, features)
        return { grid, mode: 'worker' }
      } catch (workerError) {
        console.warn('Worker unavailable, fallback para main thread:', workerError)
      }
    }

    const grid = generateHexGrid(
      selection.bounds,
      elevationData,
      features,
      mergedConfig.hexResolution,
      (progress) => {
        if (progress.phase === 'indexing-features') {
          setStatusMsg(`Main thread: indexando features ${progress.processed}/${progress.total}`)
        } else {
          setStatusMsg(`Main thread: classificando células ${progress.processed}/${progress.total}`)
        }
      }
    )

    return { grid, mode: 'main' }
  }, [mergedConfig.hexResolution, runGridOnWorker])

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

      setStatusMsg('Gerando grid hexagonal local-first (worker)...')
      const localStart = performance.now()
      const measured = await measureUiResponsiveness(() =>
        runGridWithFallback(String(requestId), selection, elevationData, features)
      )
      metricsRef.current.localLatencies.push(performance.now() - localStart)
      if (!isLatestRequest()) return

      setHexGrid(measured.result.grid)
      setPipelineState('ready')
      setStatusMsg(
        `${measured.result.grid.cells.length} hexágonos | modo=${measured.result.mode} | FPS≈${measured.fpsEstimate.toFixed(1)} | input≈${measured.inputLatencyMs.toFixed(1)}ms`
      )
      console.info('[pipeline:local-observability]', {
        p50LatencyMs: getPercentile(metricsRef.current.localLatencies, 50).toFixed(1),
        p95LatencyMs: getPercentile(metricsRef.current.localLatencies, 95).toFixed(1),
      })
    } catch (err) {
      if (hybridBackendRef.current.enabled) {
        const backendStart = performance.now()
        metricsRef.current.backendRequests += 1
        setStatusMsg('Falha local. Tentando backend de grid...')
        try {
          const grid = await backendServiceRef.current.fetchGrid(
            selection,
            mergedConfig.hexResolution,
            abortController.signal
          )
          metricsRef.current.backendLatencies.push(performance.now() - backendStart)
          if (!isLatestRequest()) return
          setHexGrid(grid)
          setPipelineState('ready')
          setStatusMsg(`${grid.cells.length} hexágonos | modo=backend-fallback`)
          console.info('[pipeline:backend-observability]', {
            p50LatencyMs: getPercentile(metricsRef.current.backendLatencies, 50).toFixed(1),
            p95LatencyMs: getPercentile(metricsRef.current.backendLatencies, 95).toFixed(1),
            errorRate: metricsRef.current.backendRequests === 0
              ? 0
              : Number((metricsRef.current.backendErrors / metricsRef.current.backendRequests).toFixed(3)),
          })
          return
        } catch (backendError) {
          metricsRef.current.backendErrors += 1
          console.error('Backend fallback error:', backendError)
        }
      }

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
  }, [mergedConfig.elevationZoom, mergedConfig.retries, mergedConfig.retryDelayMs, runGridWithFallback])

  return {
    pipelineState,
    hexGrid,
    statusMsg,
    runPipeline,
    cancel,
  }
}
