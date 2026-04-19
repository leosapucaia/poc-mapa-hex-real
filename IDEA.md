---
title: Jogo Hex Globe
status: backlog
created: 2026-04-19
updated: 2026-04-19
tags: [game, threejs, hexagonal, 3d, procedural]
priority: medium
---

# 🗺️ Jogo Hex Globe

## Descrição
Jogo usando mapa/globo hexagonal procedural com visual estilizado. Inspirado no projeto x-challenge-geo.

## Motivação
Leonardo gosta do estilo visual hexagonal com shaders customizados — globo procedural com terreno, mar animado e nuvens. Quer usar como base para um futuro jogo.

## Tech Stack (referência)
- **React Three Fiber** + **Three.js** (renderização 3D)
- **TypeScript** + **Vite**
- **GLSL custom** (shaders para mar, terreno, nuvens)
- **FBM noise** (geração procedural de biomas e terreno)
- **Geometria hexagonal** via subdivisão de icosaedro

## Conceitos-chave
- Células hexagonais como unidades de mapa (grid strategy)
- Merge de geometrias para performance (1 draw call por camada)
- Shaders animados: ondas no mar, gradientes por altitude
- Nuvens com visibilidade dinâmica via noise

## Referências
- [x-challenge-geo (repo)](https://github.com/leosapucaia/x-challenge-geo)
- [Demo ao vivo](https://x-challenge-geo.vercel.app/)
- [Tweet original Three.js](https://x.com/threejs/status/2045024314400051552)

## POC — Prova de Conceito
Ver seção dedicada: [[poc-mapa-hex-real]]

## Perguntas em aberto
- [ ] Qual API de mapas? (OpenStreetMap, Mapbox, Google Maps?)
- [ ] Formato dos dados geográficos (GeoJSON, tiles, elevation data?)
- [ ] Como mapear coordenadas reais → grid hexagonal?
- [ ] Qual resolução hexagonal para regiões reais?
- [ ] Dados de elevação: SRTM, Mapbox Terrain, OpenTopography?
- [ ] Biomas/cores: paleta estilizada ou realista?
