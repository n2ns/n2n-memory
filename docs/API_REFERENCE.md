# n2n-memory API Reference

[中文版](./API_REFERENCE_zh.md)

---

This project provides a set of knowledge graph management tools based on local project paths. All tools require a `projectPath` to ensure physical isolation of memory.

---

## Resources & Templates

N2N-Memory exposes project memory through both static resources and dynamic Resource Templates for better AI discovery.

### 1. Static Resource
- **URI**: `mcp://memory/graph`
- **Note**: Requires client to manage project path context manually or use the template below.

### 2. Resource Template (Recommended)
- **Template**: `mcp://memory/graph?path={path}`
- **Usage**: Allows AI assistants to dynamically fetch the knowledge graph by providing the absolute project path as a template parameter.
- **Example**: `mcp://memory/graph?path=/home/deploy/projects/n2n-memory`

---

---

## Tool Responses & Metadata

All N2N-Memory tools return a structured JSON response to ensure machine readability and protocol enforcement.

### Success Response Format
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

### Infrastructure Metadata (`_protocol`)
The `_protocol` field is a mandatory metadata object used to guide AI assistants during development cycles. It contains:
- `action`: The logical state change (e.g., `MEMORY_LOADED`, `CONTEXT_SYNCED`).
- `reminder`: A protocol hint for the AI (e.g., synchronization reminders).
- `policy`: Context-specific behavioral rules.

---

## Data Storage Specification
- **Path**: `.mcp/memory.json` (Cold Data) & `.mcp/context.json` (Hot Data).
- **Sorting**: All lists are lexicographically sorted to ensure clean `git diff`.
