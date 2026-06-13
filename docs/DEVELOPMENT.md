# n2n-memory Development Guide

[中文版](./DEVELOPMENT_zh.md)

---

This guide documents the daily development, testing, and build processes for the N2N Memory MCP Server.

## Development Environment
- **Runtime**: Node.js v20+ (LTS recommended)
- **Language**: TypeScript
- **Package Manager**: npm

## Common Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
This project uses Vitest with global test APIs for unit testing.
```bash
npm test
```

### 3. Development Mode (Hot Reload)
```bash
npm run dev
```

### 4. Production Build
Compiles TypeScript into native JavaScript (outputs to `build/` directory).
```bash
npm run build
```

### 5. Start Service
```bash
npm start
```

### 6. Full Local Check
```bash
npm run check
```

This runs linting, tests, TypeScript build, dependency audit, and `npm pack --dry-run`.

## Core Architecture

### Logical Layers
1. **`index.ts`**: Server bootstrap. Creates the MCP server, registers handlers, connects stdio transport, and releases locks on shutdown.
2. **`handlers/mcp-handlers.ts`**: MCP boundary. Parses Zod schemas, performs the project-root handshake, formats tool responses, and exposes resources.
3. **`core/memory-service.ts`**: Business service. Coordinates graph/context operations, in-process mutexes, cross-process locks, cache refresh, search, merging, deletes, and relation integrity checks.
4. **`core/memory-manager.ts`**: Storage repository. Handles JSON read/write, schema validation, graph normalization, atomic writes, Markdown export, and project-root output containment.
5. **`tools/schemas.ts`**: MCP input schemas for each tool.
6. **`types.ts`**: Stored data schemas and TypeScript types.

### Storage Contract
- `memory.json` stores durable graph data: entities, observations, and relations.
- `context.json` stores hot task state: active task, status, reason, next steps, last commit, and server-managed `updatedAt`.
- Missing storage files are treated as empty/default state.
- Existing but unreadable storage files throw errors. This prevents corrupted data from being overwritten by an empty graph.
- Export paths must be relative to the project root and cannot escape it.
- Project root discovery requires strong markers such as `.git`, `.mcp`, `package.json`, `tsconfig.json`, or language-specific build files. README-only directories are rejected.
- Full local paths are hidden from logs by default. Set `N2N_LOG_LEVEL=debug` for complete path diagnostics.

### Key Algorithm: Git-Friendly Sorting
Whenever the graph is written, `MemoryManager` normalizes a copy of the graph before persisting it:
- Entities are sorted by name.
- Observations are sorted inside each entity.
- Relations are sorted by `from`, then `to`, then `relationType`.
- JSON is written with 2-space indentation.

This ensures that even if fragments are generated out of order, Git diffs remain stable and readable.

### Concurrency and Cache Behavior
- `MemoryService` uses one in-process `Mutex` per project for graph writes and a separate mutex for context writes.
- `proper-lockfile` protects writes across processes.
- Graph and context snapshots are cached by project path, but normal reads check file mtimes so external edits, Git pulls, or other MCP processes are observed.
- Writes use a temporary JSON file followed by an atomic move.

### Graph Integrity
- Entity names are the stable identifiers within a project graph.
- `n2n_create_relations` rejects relations whose `from` or `to` endpoint is missing.
- Deleting entities also deletes relations attached to those entities.

### CI and Publishing
- Pull requests and pushes to `main` run `.github/workflows/ci.yml` on Node.js 20 and 22.
- Tag pushes run `.github/workflows/publish.yml`, which executes `npm run check` before publishing.
- `package.json` uses a `files` whitelist so npm packages contain only `build/`, `docs/`, `README.md`, `CHANGELOG.md`, and `LICENSE`.

## Contribution Guidelines
- All logic changes must be accompanied by corresponding unit tests.
- Update `docs/DESIGN.md` before making changes to the storage structure.
- Update `docs/API_REFERENCE.md` and `docs/API_REFERENCE_zh.md` when tool schemas or behavior change.
- Run `npm run check` before publishing or opening a PR.
