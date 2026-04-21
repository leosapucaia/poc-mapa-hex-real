/// <reference lib="webworker" />

import { generateHexGrid } from '../lib/hex-grid'
import type { WorkerRequestMessage, WorkerResponseMessage } from './pipeline.worker.types'

function post(message: WorkerResponseMessage) {
  self.postMessage(message)
}

self.onmessage = (event: MessageEvent<WorkerRequestMessage>) => {
  const message = event.data

  if (message.type !== 'request') {
    post({
      type: 'error',
      requestId: 'unknown',
      error: 'Mensagem inválida para worker',
    })
    return
  }

  const { requestId, payload } = message

  try {
    const grid = generateHexGrid(
      payload.selection.bounds,
      payload.elevationData,
      payload.features,
      payload.hexResolution,
      (progress) => {
        post({ type: 'progress', requestId, payload: progress })
      }
    )

    post({
      type: 'response',
      requestId,
      payload: {
        grid,
      },
    })
  } catch (error) {
    post({
      type: 'error',
      requestId,
      error: error instanceof Error ? error.message : 'Erro desconhecido no worker',
    })
  }
}

export {}
