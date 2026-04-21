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

### Requirement: Contrato backend versionado para hex grid
O sistema SHALL suportar um contrato versionado opcional para geração de hex grid no backend.

#### Scenario: Payload de geração remota
- **WHEN** o frontend aciona backend de hex grid
- **THEN** envia payload com `{bbox, resolution, options}`

#### Scenario: Resposta versionada
- **WHEN** o backend retorna o grid
- **THEN** a resposta inclui `version` (ex: `v1`), `grid` e metadados de cache/latência

### Requirement: Estratégia de cache geoespacial
O backend SHALL permitir cache por chave geoespacial normalizada e resolução.

#### Scenario: Derivação da chave de cache
- **WHEN** uma request é recebida
- **THEN** a chave deve incluir versão do contrato, resolução e bbox normalizado

### Requirement: Modo híbrido local-first com fallback
O frontend SHALL executar geração local primeiro e usar backend como fallback opcional em falhas.

#### Scenario: Fallback backend
- **WHEN** a geração local falha e o backend híbrido está habilitado
- **THEN** o frontend deve tentar `POST /api/hex-grid` e marcar execução como `backend-fallback`
