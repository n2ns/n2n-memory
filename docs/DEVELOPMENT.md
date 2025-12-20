# n2n-memory Development Guide

[中文版](./DEVELOPMENT_zh.md)

---

This guide documents the daily development, testing, and build processes for the N2N Memory MCP Server.

## Development Environment
- **Runtime**: Node.js v24.x+ (Recommended for Trusted Publishing support)
- **Language**: TypeScript
- **Package Manager**: npm

## Common Commands

### 1. Install Dependencies
```bash
npm install
```

### 2. Run Tests
This project uses `mocha` + `ts-node`/`tsx` for unit testing.
```bash
npm test
```
> **Note**: On Windows, the test script is configured to handle ESM path compatibility correctly.

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

## Core Architecture

### Logical Layers
1. **`index.ts`**: MCP protocol layer. Handles JSON-RPC, resources, and uses **Zod** for input validation.
2. **`memory-manager.ts`**: Service layer. Responsible for file I/O, data sorting, entity merging, and core algorithms.
3. **`types.ts`**: Types and Schema definitions. Contains Zod validation rules and serves as the project's type baseline.

### Key Algorithm: Git-Friendly Sorting
Whenever a write operation (Update/Create) is performed, `MemoryManager.save` is triggered:
- It recursively sorts arrays.
- This ensures that even if fragments are generated out of order, the Git file diff remains stable and readable.

## Contribution Guidelines
- All logic changes must be accompanied by corresponding unit tests.
- Update `docs/DESIGN.md` before making changes to the storage structure.
