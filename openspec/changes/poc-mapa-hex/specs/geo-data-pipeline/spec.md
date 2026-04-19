## ADDED Requirements

### Requirement: Extração de dados de elevação
O sistema SHALL obter dados de elevação para a região selecionada via SRTM/OpenTopography.

#### Scenario: Consultar SRTM
- **WHEN** uma região é confirmada pelo usuário
- **THEN** dados de elevação SRTM são obtidos para o bounding box via OpenTopography ou fonte equivalente

#### Scenario: Amostrar elevação por ponto
- **WHEN** o grid hexagonal é gerado
- **THEN** cada célula hex tem um valor de elevação amostrado dos dados raster

### Requirement: Extração de features geográficas
O sistema SHALL extrair features geográficas (água, estradas, terreno) da região via Overpass API.

#### Scenario: Consultar Overpass API
- **WHEN** uma região é confirmada
- **THEN** features OSM relevantes (água, estradas, terreno) são extraídas via Overpass API

#### Scenario: Classificar tipo de terreno
- **WHEN** features são processadas
- **THEN** cada feature é classificada em categorias (água, floresta, urbano, estrada, etc.)

### Requirement: Formato de saída padronizado
O pipeline SHALL normalizar os dados geográficos em um formato consistente para consumo pelo hex grid generator.

#### Scenario: Output estruturado
- **WHEN** o pipeline processa a região
- **THEN** produz um objeto com: elevation grid (2D array), features GeoJSON classificadas, bounding box
