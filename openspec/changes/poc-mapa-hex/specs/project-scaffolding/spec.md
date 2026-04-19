## ADDED Requirements

### Requirement: Projeto Vite + React + TypeScript
O projeto SHALL usar Vite como bundler com React e TypeScript.

#### Scenario: Inicializar projeto
- **WHEN** o scaffolding é executado
- **THEN** um projeto Vite + React + TypeScript funcional é criado

#### Scenario: Configurar Tailwind CSS
- **WHEN** o projeto é criado
- **THEN** Tailwind CSS está configurado e funcionando com shadcn/ui

### Requirement: Dependências instaladas
Todas as dependências necessárias SHALL estar instaladas e prontas para uso.

#### Scenario: Core dependencies
- **WHEN** o projeto é inicializado
- **THEN** react, three.js, @react-three/fiber, @react-three/drei estão instalados

#### Scenario: Map dependencies
- **WHEN** o projeto é inicializado
- **THEN** maplibre-gl e dependências de mapa estão instaladas

#### Scenario: Geo dependencies
- **WHEN** o projeto é inicializado
- **THEN** h3-js está instalado e importável

### Requirement: Estrutura de pastas organizada
O projeto SHALL seguir uma estrutura de pastas organizada por feature.

#### Scenario: Organização por feature
- **WHEN** o projeto é criado
- **THEN** segue estrutura com pastas: `src/components/`, `src/lib/`, `src/shaders/`, `src/hooks/`
