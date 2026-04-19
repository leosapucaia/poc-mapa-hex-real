## ADDED Requirements

### Requirement: Seleção de região interativa
O sistema SHALL permitir que o usuário selecione uma região geográfica através de um mapa interativo.

#### Scenario: Carregar mapa mundial
- **WHEN** a aplicação é aberta
- **THEN** um mapa interativo centrado no mundo é exibido usando MapLibre GL

#### Scenario: Selecionar bounding box
- **WHEN** o usuário desenha um retângulo ou arrasta para definir uma área
- **THEN** as coordenadas (lat/lng do canto noroeste e sudeste) são capturadas e exibidas

#### Scenario: Confirmar seleção
- **WHEN** o usuário confirma a região selecionada
- **THEN** as coordenadas são passadas para o pipeline de dados geográficos

### Requirement: Estilo shadcn/ui
A interface SHALL seguir o estilo visual shadcn/ui (Tailwind, componentes copia-e-cola, acessíveis).

#### Scenario: Componentes estilizados
- **WHEN** o mapa e controles são renderizados
- **THEN** usam Tailwind CSS com tokens de design consistentes (shadcn/ui pattern)
