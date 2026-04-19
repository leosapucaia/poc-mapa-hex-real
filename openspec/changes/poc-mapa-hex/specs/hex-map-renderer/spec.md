## ADDED Requirements

### Requirement: Renderização 3D de hexágonos em plano
O sistema SHALL renderizar o grid hexagonal como prismas 3D em vista planar usando React Three Fiber.

#### Scenario: Criar geometria hexagonal
- **WHEN** o grid hexagonal é recebido
- **THEN** cada célula é renderizada como um prisma hexagonal com altura proporcional à elevação

#### Scenario: Cores por bioma/altitude
- **WHEN** hexágonos são renderizados
- **THEN** cada um recebe cor baseada no tipo de terreno e altitude (shader customizado)

#### Scenario: Câmera interativa
- **WHEN** o mapa é exibido
- **THEN** o usuário pode orbitar, zoom e pan com OrbitControls

### Requirement: Shaders customizados GLSL
A renderização SHALL usar shaders GLSL customizados para efeitos estilizados inspirados no x-challenge-geo.

#### Scenario: Gradiente de altitude
- **WHEN** terreno é renderizado
- **THEN** cores transicionam de verde (baixo) → marrom (médio) → branco (alto) via shader

#### Scenario: Água animada
- **WHEN** células de água são renderizadas
- **THEN** shader de ondas anima a superfície com FBM noise

#### Scenario: Iluminação dinâmica
- **WHEN** a cena é renderizada
- **THEN** iluminação direcional cria relevo visual nos hexágonos

### Requirement: Performance com muitos hexágonos
A renderização SHALL manter framerate aceitável com grids grandes usando geometry merging.

#### Scenario: Geometry merging
- **WHEN** hexágonos do mesmo tipo são renderizados
- **THEN** geometrias são merged em batches por material (1 draw call por camada)

#### Scenario: Framerate alvo
- **WHEN** um grid de ~5000 células é renderizado
- **THEN** mantém ≥ 30 FPS em hardware mediano
