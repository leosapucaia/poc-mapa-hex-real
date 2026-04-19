# Contributing — POC Mapa Hex Real

## Conventions

### Branch Naming
```
feature/<capability-name>     # New feature (matches OpenSpec capability)
fix/<short-description>       # Bug fixes
chore/<short-description>     # Maintenance, deps, config
docs/<short-description>      # Documentation only
```

### Commit Messages (Conventional Commits)
```
feat: add hex grid generator
fix: correct elevation sampling offset
chore: update dependencies
docs: add API reference for geo pipeline
test: add unit tests for region selector
```

### OpenSpec Workflow
Every feature branch MUST correspond to an OpenSpec capability:
1. Branch name matches capability name: `feature/region-selector`
2. Implementation follows the spec in `openspec/changes/poc-mapa-hex/specs/<name>/spec.md`
3. PR description references the spec being implemented

### PR Flow
```
1. Create branch from main: git checkout -b feature/<name>
2. Implement following OpenSpec tasks
3. Open PR → CI runs (lint, type-check, build, test)
4. Automated review by agent (spec compliance + code quality)
5. Fix issues if any
6. Merge to main (squash)
7. Orchestrator marks tasks as done in tasks.md
8. After all capabilities: openspec archive
```

### Testing
- Unit tests alongside code: `src/lib/__tests__/` or `*.test.ts`
- Run: `npm test`
- Visual verification: screenshots for render features (browser tool)

### Project Structure
```
src/
├── components/     # React components
├── hooks/          # Custom hooks
├── lib/            # Core logic (geo pipeline, hex grid, etc.)
├── shaders/        # GLSL shader files
└── App.tsx         # Entry point
```
