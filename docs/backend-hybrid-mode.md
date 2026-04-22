# Camada opcional de backend para Hex Grid (local-first + fallback)

Este documento define a primeira versão da arquitetura híbrida para suportar:

- **seleções grandes** (alto volume de células),
- **uso recorrente** (mesmas regiões/resoluções consultadas várias vezes),
- e **fallback resiliente** quando o processamento local falhar.

## 1) Contrato de payload/resposta

### Request (`POST /api/hex-grid`)

```json
{
  "bbox": {
    "sw": { "lat": -23.05, "lng": -43.75 },
    "ne": { "lat": -22.80, "lng": -43.10 }
  },
  "resolution": 7,
  "options": {
    "includeFeatures": true,
    "includeElevation": true,
    "requestId": "req-123"
  }
}
```

### Response versionada (`v1`)

```json
{
  "version": "v1",
  "generatedAt": "2026-04-21T12:00:00.000Z",
  "grid": { "cells": [], "resolution": 7, "bounds": { "sw": {}, "ne": {} } },
  "meta": {
    "requestId": "req-123",
    "cache": {
      "key": "hex:v1:7:-23.0500,-43.7500:-22.8000,-43.1000",
      "hit": true,
      "ttlSeconds": 900
    },
    "metrics": {
      "serverLatencyMs": 128
    }
  }
}
```

## 2) Política de cache

### Chave geoespacial

Formato recomendado:

```text
hex:v1:<resolution>:<swLat4>,<swLng4>:<neLat4>,<neLng4>
```

- Coordenadas normalizadas com **4 casas decimais** (equilibra reaproveitamento e precisão).
- `version` no prefixo evita colisão entre evoluções de schema.
- `resolution` separa corretamente o custo/volume por granularidade do H3.

### TTL sugerido

- **Hot cache (memória/redis):** 10 a 30 min.
- **Warm cache (persistente):** 24h para regiões populares.
- **Stale-while-revalidate:** opcional para diminuir latência percebida.

## 3) Invalidação e observabilidade

### Invalidação

Invalidação deve ocorrer quando houver mudança em qualquer dependência determinística do grid:

1. `version` do contrato (`v1 -> v2`),
2. alteração do algoritmo de geração/classificação,
3. atualização relevante de fonte geográfica (elevação/features),
4. mudança da normalização da chave geoespacial.

Estratégias:

- **Version bump** (preferencial): invalidação global simples.
- **Tag-based purge** por resolução/região em incidents localizados.
- **TTL + lazy refresh** para suavizar picos após expiração.

### Observabilidade mínima

Métricas obrigatórias:

- `hexgrid_latency_ms` (p50, p95),
- `hexgrid_error_rate`,
- `hexgrid_cache_hit_rate`,
- `hexgrid_request_count`.

No frontend, a camada híbrida iniciou logs de:

- latência local p50/p95,
- latência backend p50/p95,
- taxa de erro de fallback backend.

## 4) Modo híbrido no frontend

Fluxo adotado nesta primeira etapa:

1. **Local-first**: tenta pipeline local (worker/main thread).
2. Se falhar, e `backendMode.enabled = true`, executa **fallback** para `/api/hex-grid`.
3. Retorna estado `ready` com `modo=backend-fallback` quando backend responde.

Configuração:

```ts
usePipelineController({
  backendMode: {
    enabled: true,
    endpoint: '/api/hex-grid'
  }
})
```

> Nesta fase, o backend é opcional e o comportamento padrão continua local.
