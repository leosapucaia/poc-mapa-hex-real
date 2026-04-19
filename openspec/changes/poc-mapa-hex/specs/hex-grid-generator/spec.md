## ADDED Requirements

### Requirement: Geração de grid hexagonal
O sistema SHALL converter dados geográficos em um grid hexagonal usando h3-js.

#### Scenario: Projetar coordenadas em grid
- **WHEN** dados geográficos são recebidos
- **THEN** um grid hexagonal é gerado cobrindo o bounding box com resolução h3 configurável

#### Scenario: Amostrar dados por célula
- **WHEN** o grid é criado
- **THEN** cada célula hex recebe: elevação média, tipo de terreno dominante, flag de água

#### Scenario: Resolução configurável
- **WHEN** o usuário ajusta a resolução (zoom level h3)
- **THEN** o grid é regenerado com mais ou menos células (resolução 5-9, ~500m a ~50m por hex)

### Requirement: Performance da geração
A geração do grid SHALL ser rápida o suficiente para uso interativo.

#### Scenario: Grid de região média
- **WHEN** uma cidade média é selecionada (~50km²)
- **THEN** o grid é gerado em menos de 2 segundos

#### Scenario: Grid de região grande
- **WHEN** uma região grande é selecionada (~500km²)
- **THEN** o grid é gerado em menos de 10 segundos ou o sistema avisa sobre limitação
