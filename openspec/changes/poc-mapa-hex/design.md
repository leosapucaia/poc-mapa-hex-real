## Context

POC para provar viabilidade de renderizar regiões reais como mapa hexagonal estilizado. Inspirado no x-challenge-geo (globo procedural com shaders), adaptado para **plano** (não esfera). Stack 100% open source.

## Goals / Non-Goals

**Goals:**
- Provar que dados geográficos reais + grid hexagonal + shaders customizados funciona visualmente
- Pipeline funcional: selecionar região → extrair dados → gerar grid → renderizar
- Estética similar ao x-challenge-geo (terreno colorido, água animada, iluminação)
- Base reutilizável para futuro jogo

**Non-Goals:**
- Não é um jogo completo — é uma POC visual
- Não precisa de multiplayer, saves, ou mecânicas de jogo
- Não precisa cobrir globo inteiro — uma região por vez
- Não precisa de mobile (desktop first)

## Decisions

### 1. MapCN para seleção de região
- **Decisão**: Usar MapCN (MapLibre GL + shadcn/ui) ao invés de Leaflet ou Mapbox
- **Razão**: Leonardo prefere shadcn/ui, MapCN é open source, MapLibre não tem vendor lock-in
- **Fallback**: Leaflet se MapCN tiver problemas

### 2. h3-js (Uber) para indexação hexagonal
- **Decisão**: Usar h3-js ao invés de gerar grid manualmente
- **Razão**: Biblioteca madura, usada em produção pela Uber, boa performance, resoluções configuráveis (0-15)
- **Resolução alvo**: 5-9 (~500m a ~50m por hex)

### 3. SRTM/OpenTopography para elevação
- **Decisão**: Dados de elevação gratuitos via API OpenTopography
- **Razão**: Dados globais, gratuitos, resolução 30m, sem API key necessária para uso básico
- **Alternativa**: Mapbox Terrain (se precisar de melhor integração)

### 4. Overpass API para features geográficas
- **Decisão**: Consultar OpenStreetMap via Overpass API
- **Razão**: Dados ricos (água, estradas, edifícios, vegetação), open source, sem API key
- **Cuidado**: Rate limits — cachear resultados, queries otimizadas

### 5. Geometry merging por material
- **Decisão**: Merge de geometrias de hexágonos do mesmo tipo em um único mesh
- **Razão**: Reduz draw calls drasticamente (~5000 hexágonos → ~5-10 draw calls por material)
- **Implementação**: BufferGeometryUtils.mergeGeometries() do Three.js

### 6. Shaders customizados (GLSL)
- **Decisão**: Vertex + fragment shaders próprios ao invés de materiais padrão Three.js
- **Razão**: Controle total sobre visual, animações de água, gradientes de altitude
- **Referência**: Shaders do x-challenge-geo como base

### 7. View plana (não esfera)
- **Decisão**: Renderizar em plano XY com câmera em Z, não como globo
- **Razão**: Mais intuitivo para regiões reais, alinha com conceito de mapa, simplifica matemática

## Risks / Trade-offs

- **Performance com regiões grandes**: Grid de 50k+ células pode ser pesado. Mitigar com LOD ou limite de área.
- **Qualidade dos dados SRTM**: Resolução 30m pode gerar terreno "liso" demais em áreas planas.
- **CORS na Overpass API**: Pode precisar de proxy em produção. OK para dev local.
- **MapCN estágio inicial**: Projeto relativamente novo, pode ter bugs. Leaflet como fallback.
- **Visual plano vs esfera**: A estética do x-challenge-geo depende parcialmente da curvatura da esfera. Pode perder charme em plano.
