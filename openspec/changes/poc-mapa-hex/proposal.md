## Why

Precisamos provar que é viável renderizar uma **região real do mapa mundial** como **mapa hexagonal** usando a estética do projeto x-challenge-geo (React Three Fiber + shaders customizados). Essa POC é o primeiro passo concreto para um futuro jogo hex globe — sem ela, não sabemos se a fusão de dados geográficos reais com grid hexagonal funciona na prática.

## What Changes

- Nova aplicação React/TypeScript com Vite
- Integração com OpenStreetMap para seleção de região e dados geográficos
- Pipeline de dados: extrair elevação (SRTM) + features geográficas (OSM) → converter para grid hexagonal (h3-js)
- Renderização 3D com React Three Fiber adaptada para plano (não esfera)
- Shaders customizados por altitude/bioma com água animada
- Interface de seleção de região usando MapCN (MapLibre GL + shadcn/ui)

## Capabilities

### New Capabilities
- `region-selector`: Interface para escolher área do mapa (bounding box) com MapCN/MapLibre
- `geo-data-pipeline`: Extração e processamento de dados geográficos (elevação SRTM, features OSM) para a região selecionada
- `hex-grid-generator`: Conversão de dados geográficos para grid hexagonal usando h3-js
- `hex-map-renderer`: Renderização 3D dos hexágonos com React Three Fiber, shaders por altitude/bioma, água animada
- `project-scaffolding`: Setup inicial do projeto (Vite + React + TypeScript + Tailwind + dependências)

### Modified Capabilities
(nenhuma — projeto greenfield)

## Impact

- **Dependências novas**: react, three.js, @react-three/fiber, @react-three/drei, h3-js, maplibre-gl, tailwindcss, vite
- **APIs externas**: OpenStreetMap (Overpass API), SRTM/OpenTopography (elevation data)
- **Repositório**: novo projeto em `~/projects/poc-mapa-hex-real/`
- **Referência visual**: x-challenge-geo (repo existente do Leonardo)
