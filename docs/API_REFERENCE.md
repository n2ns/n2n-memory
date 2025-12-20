# n2n-memory API Reference

[中文版](./API_REFERENCE_zh.md)

---

This project provides a set of knowledge graph management tools based on local project paths. All tools require a `projectPath` to ensure physical isolation of memory.

## Initialization & Handshake

N2N-Memory enforces a strict project root policy. Memory will only be initialized in directories containing project markers (e.g., `.git`, `package.json`).

1. **Detection**: Upon the first call, the server detects the root.
2. **Confirmation**: If it's a new project, the server returns `AWAITING_CONFIRMATION`. You must call the tool again with `confirmNewProjectRoot` set to the detected path.

---

## Core Toolset

### 1. `n2n_add_entities`
Adds new entities to the project's knowledge graph.

**Input Parameters:**
- `projectPath` (string): Absolute path to project root.
- `entities` (Array): List of `{ name, entityType, observations }`.

---

### 2. `n2n_read_graph`
Reads project memory and active context.

**Input Parameters:**
- `projectPath` (string): Absolute path to project root.
- `summaryMode` (boolean, optional): If true, returns entities without observations.
- `limit` (number, optional): Max entities to return.
- `offset` (number, optional): Entities to skip.

**Returns:**
- `graph`: Object with entities and relations.
- `context`: Active task status and next steps.
- `totalEntityCount`: Total entities in project.
- `isTruncated`: True if more data exists.

---

### 3. `n2n_get_graph_summary`
Quickly fetch a lightweight index of all entities.

**Input Parameters:**
- `projectPath` (string): Absolute path to project root.
- `limit` / `offset` (optional): Pagination parameters.

**Returns:**
- List of `{ name, type }` and `relationCount`.

---

### 4. `n2n_update_context`
Update the "Hot State" of the project (status, next steps).

**Input Parameters:**
- `status` (enum): `PLANNING`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`.
- `nextSteps` (string[]): Planned actions.

---

### 5. `n2n_search`
Keyword search with pagination.

**Input Parameters:**
- `query` (string): Search term.
- `limit` / `offset` (optional): Pagination.

---

### 6. `n2n_open_nodes`
Retrieve specific entities by name for focused context.

---

## Data Storage Specification
- **Path**: `.mcp/memory.json` (Cold Data) & `.mcp/context.json` (Hot Data).
- **Sorting**: All lists are lexicographically sorted to ensure clean `git diff`.
