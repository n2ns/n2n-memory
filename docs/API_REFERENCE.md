# n2n-memory API Reference

[中文版](./API_REFERENCE_zh.md)

---

N2N-Memory provides project-local knowledge graph tools over MCP. Every tool requires `projectPath`, the absolute path of the project root or workspace top-level directory. The server does not recursively search parent directories; this is intentional to prevent cross-project memory pollution.

Project recognition requires a strong marker such as `.git`, `.mcp`, `package.json`, `tsconfig.json`, or a language-specific build file. README-only directories are treated as weak roots and rejected.

## SEO and discoverability notes

- Recommended labels: **project-local MCP memory**, **AI coding memory graph**, **local-first AI context storage**.
- Primary user intent: repository context recovery, deterministic project memory, and safe AI coding assistant handoff.
- This API is designed for local-first agents and does not depend on cloud infrastructure.

## Shared Parameters

All tools include:

- `projectPath` (`string`, required): Absolute project root or workspace top-level path.
- `confirmNewProjectRoot` (`string`, optional): Required only when initializing a project that does not yet have `.mcp`. Use the `detectedRoot` value returned by the handshake response.

If the server recognizes a project root but `.mcp` is missing, it returns an `AWAITING_CONFIRMATION` error response. Call the same tool again with `confirmNewProjectRoot` set to the detected root.

## Data Storage

- Cold graph: `.mcp/memory.json`
- Hot context: `.mcp/context.json`
- Atomic writes: JSON is written to a temporary file and then moved into place.
- Stable diffs: entities, observations, and relations are sorted before graph writes.
- Data integrity: existing but unreadable JSON files raise an error instead of being treated as empty memory.
- Path containment: exported files must stay inside the project root.
- Logging: full local paths are hidden from server logs by default. Set `N2N_LOG_LEVEL=debug` to include complete paths while troubleshooting.

## Data Model

### Entity
```json
{
  "name": "MemoryService",
  "entityType": "CLASS",
  "observations": ["Coordinates graph and context reads"]
}
```

### Relation
```json
{
  "from": "MemoryService",
  "to": "MemoryManager",
  "relationType": "USES"
}
```

Relations must reference existing entities. Orphan relations are rejected.

### Project Context
```json
{
  "activeTask": "Refactor storage layer",
  "status": "IN_PROGRESS",
  "reason": "Optional status reason",
  "nextSteps": ["Run tests"],
  "lastCommit": "abc123 or message",
  "updatedAt": "2026-06-14T00:00:00.000Z"
}
```

`updatedAt` is managed by the server when context is written.

## Resources & Templates

### Static Resource
- **URI**: `mcp://memory/graph`
- **Note**: Requires the client to manage project path context or use the template below.

### Resource Template
- **Template**: `mcp://memory/graph?path={path}`
- **Example**: `mcp://memory/graph?path=/home/deploy/projects/n2n-memory`
- **Behavior**: Returns the complete graph and active context for established projects. New projects must be initialized through tools because resources cannot perform the confirmation handshake.

## Tool Responses & Metadata

Most mutating tools return structured JSON:

```json
{
  "status": "success",
  "message": "Human-readable description of the operation.",
  "_protocol": {
    "action": "MEMORY_UPDATED",
    "reminder": "Remember to call n2n_update_context before 'git commit'."
  }
}
```

The `_protocol` field guides AI assistants during development cycles:

- `action`: Logical state change, such as `MEMORY_LOADED`, `MEMORY_UPDATED`, or `CONTEXT_SYNCED`.
- `reminder`: Synchronization hint for AI assistants.
- `policy` / `tip`: Context-specific behavior guidance when present.

## Common usage patterns

1. Start each session by calling `n2n_read_graph` with `summaryMode: true` to inspect the project index.
2. Add durable facts with `n2n_add_entities` and `n2n_add_observations`.
3. Link facts with `n2n_create_relations`.
4. Track daily work in `n2n_update_context` before major refactors.
5. Before commit, call `n2n_read_graph` again so the context reminder is refreshed.

Example `n2n_update_context` payload:

```json
{
  "projectPath": "/absolute/path/to/repo",
  "activeTask": "Refactor MCP error handling",
  "status": "IN_PROGRESS",
  "nextSteps": ["Run tests", "Update docs"],
  "reason": "Refactor without changing public API"
}
```

## Tools

### `n2n_add_entities`

Create new entities or merge observations into existing entities with the same name.

Additional input:

- `entities` (`Entity[]`, required)

Notes:

- Existing entity type is preserved.
- Observations are deduplicated with lightweight similarity checks.

### `n2n_add_observations`

Append observations to existing entities.

Additional input:

- `observations` (`Array<{ entityName: string; contents: string[] }>`, required)

Notes:

- Observations for missing entities are skipped.
- The response reports how many observation fragments were actually added after deduplication.

### `n2n_create_relations`

Create directed relations between existing entities.

Additional input:

- `relations` (`Relation[]`, required)

Notes:

- Duplicate relations are ignored.
- Relations pointing to missing entities are rejected.

### `n2n_read_graph`

Read project graph and active context together.

Additional input:

- `summaryMode` (`boolean`, optional): Return entity names and types without observations.
- `limit` (`number`, optional): Maximum entities to return.
- `offset` (`number`, optional): Number of entities to skip.

Output includes:

- `graph`
- `context`
- `totalEntityCount`
- `isTruncated`
- `_protocol`

When paginated, relations are included only when both endpoints are present in the current page.

### `n2n_get_graph_summary`

Return a lightweight entity index plus total relation count.

Additional input:

- `limit` (`number`, optional)
- `offset` (`number`, optional)

Output includes:

- `entities`: `{ name, type }[]`
- `relationCount`
- `totalEntityCount`
- `isTruncated`

### `n2n_update_context`

Update hot project context.

Additional input:

- `activeTask` (`string`, optional)
- `status` (`"IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "PLANNING"`, optional)
- `reason` (`string`, optional)
- `nextSteps` (`string[]`, optional)
- `lastCommit` (`string`, optional)

Notes:

- Updates are merged with the current context.
- `updatedAt` is set automatically.

### `n2n_search`

Search entities by name, type, and observations. Fuzzy matching is enabled by default.

Additional input:

- `query` (`string`, required)
- `limit` (`number`, optional)
- `offset` (`number`, optional)
- `fuzzy` (`boolean`, optional, default `true`)
- `minScore` (`number`, optional, default `0.3`)

Output includes matching entities, related relations, `totalResults`, and `isTruncated`.

### `n2n_delete_entities`

Delete entities and all relations attached to them.

Additional input:

- `entityNames` (`string[]`, required)

Output reports the number of deleted entities.

### `n2n_delete_observations`

Delete exact observation strings from entities.

Additional input:

- `deletions` (`Array<{ entityName: string; observations: string[] }>`, required)

Output reports the number of deleted observations.

### `n2n_delete_relations`

Delete exact relation triples.

Additional input:

- `relations` (`Relation[]`, required)

Output reports the number of deleted relations.

### `n2n_open_nodes`

Retrieve specific entities by name.

Additional input:

- `names` (`string[]`, required)

Output includes matching entities and relations where both endpoints are among the returned entities.

### `n2n_export_markdown`

Export the graph to Markdown for review or documentation.

Additional input:

- `outputPath` (`string`, optional): Relative output path inside the project root. Defaults to `KNOWLEDGE_GRAPH.md`.

Notes:

- Absolute paths are rejected.
- Relative paths that escape the project root are rejected.
