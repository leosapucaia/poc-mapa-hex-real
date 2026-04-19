# 🗺️ POC — Mapa Hexagonal de Região Real

Prova de conceito: renderizar uma região real do mapa mundial como mapa hexagonal estilizado.

## Quick Start

```bash
# Local
npm install
npm run dev

# Docker
docker compose up dev       # desenvolvimento
docker compose up prod      # preview produção (http://localhost:3000)
```

## Scripts

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Dev server com hot-reload |
| `npm run build` | Build de produção |
| `npm run preview` | Preview do build local |
| `npm test` | Testes unitários (vitest) |
| `npm run test:watch` | Testes em watch mode |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |

## Stack

- **Vite** + **React** + **TypeScript**
- **Tailwind CSS** v4
- **Three.js** + **React Three Fiber** (3D)
- **MapLibre GL** (2D map)
- **h3-js** (hex grid indexing)

## Project Structure

```
src/
├── components/     # React components
├── hooks/          # Custom hooks
├── lib/            # Core logic (geo pipeline, hex grid, etc.)
├── shaders/        # GLSL shader files
├── test/           # Test files
└── App.tsx         # Entry point
```

## Workflow

Projeto usa [OpenSpec](https://openspec.dev/) para spec-driven development.
Veja `CONTRIBUTING.md` para convenções de branch, commits e PRs.

## Docker Services

| Service | URL | Descrição |
|---------|-----|-----------|
| `dev` | http://localhost:5173 | Dev server (hot-reload) |
| `prod` | http://localhost:3000 | Production preview (nginx) |
| `cors-proxy` | http://localhost:8080 | CORS proxy for APIs |
