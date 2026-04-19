---
title: POC — Mapa Hexagonal de Região Real
status: backlog
created: 2026-04-19
updated: 2026-04-19
tags: [poc, hexagonal, maps, geojson, threejs, elevation]
priority: high
parent: hex-globe-game
---

# 🧪 POC — Mapa Hexagonal de Região Real

## Objetivo
Provar que conseguimos pegar uma **região real do mapa mundial** e renderizá-la como **mapa hexagonal** usando a tecnologia do x-challenge-geo.

## Fluxo desejado
```
1. Usuário seleciona região no mapa (ex: Rio de Janeiro, Alpes, etc.)
2. Sistema extrai dados geográficos da região
3. Converte para grid hexagonal
4. Renderiza com shaders estilo x-challenge-geo (terreno, altitude, bioma)
```

## Componentes necessários

### 1. Seleção de região
- Interface para escolher área (bounding box ou polígono)
- Possíveis APIs: OpenStreetMap, Mapbox, Google Maps
- Output: coordenadas (lat/lng) da região selecionada

### 2. Dados geográficos
- **Elevação**: SRTM, Mapbox Terrain API, OpenTopography
- **Biomas/land cover**: OpenStreetMap land use, Natural Earth data
- **Hidrografia**: rios, oceanos, lagos (OSM water features)
- Formatos: GeoJSON, raster tiles, elevation TIFF

### 3. Conversão Geo → Hex
- Projetar coordenadas lat/lng em plano 2D
- Gerar grid hexagonal sobre a região
- Para cada hex: amostrar elevação, tipo de terreno, se é água
- Referência: bibliotecas como `h3-js` (Uber) para indexação hexagonal

### 4. Renderização
- Adaptar o HexGlobe do x-challenge-geo para plano (não esfera)
- Shaders com cores por bioma/altitude
- Mar/rios animados
- Câmera 2.5D ou 3D com orbit controls

## Stack definida (open source first)
- **OpenStreetMap** — dados geográficos base (rios, estradas, terreno)
- **SRTM / OpenTopography** — dados de elevação gratuitos
- **h3-js** (Uber, open source) — indexação hexagonal geográfica
- **MapCN** (mapcn.dev) — interface de mapa interativa (MapLibre GL + shadcn/ui + Tailwind)
- **React Three Fiber** — renderização 3D dos hexágonos
- **GeoJSON** — formato de dados geográficos
- Alternativas: Leaflet (fallback), Mapbox/Google Maps (apenas se OSM não atender)

## Riscos e desafios
- Performance com muitos hexágonos (regiões grandes = milhares de células)
- Alinhamento de dados de elevação com grid hexagonal
- Qualidade visual na transação esfera → plano
- CORS e limites de API nos serviços de mapas

## Milestones
- [ ] **M1**: Selecionar região e ver bounding box no mapa
- [ ] **M2**: Extrair dados de elevação da região
- [ ] **M3**: Gerar grid hex sobre a região com dados reais
- [ ] **M4**: Renderizar com shaders (terreno colorido por altitude)
- [ ] **M5**: Adicionar água (rios, oceanos) animada

## Referências
- [OpenStreetMap](https://www.openstreetmap.org/) — dados geográficos open source
- [Overpass API](https://overpass-api.de/) — consultar dados OSM programaticamente
- [SRTM Elevation Data](https://www2.jpl.nasa.gov/srtm/) — dados de elevação gratuitos (NASA)
- [OpenTopography](https://opentopography.org/) — dados topográficos abertos
- [h3-js (Uber)](https://github.com/uber/h3-js) — Hexagonal geospatial indexing (open source)
- [MapCN](https://mapcn.dev/) — map components shadcn/ui style (built on MapLibre)
- [MapLibre GL JS](https://maplibre.org/) — renderização de mapas vetoriais open source
- [x-challenge-geo](https://github.com/leosapucaia/x-challenge-geo) — base visual 3D
- [Leaflet](https://leafletjs.com/) — fallback open source
