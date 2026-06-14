# n2n-memory

Project-local knowledge-graph memory MCP server from N2NS Lab for AI coding agents.

[![npm version](https://img.shields.io/npm/v/n2n-memory)](https://www.npmjs.com/package/n2n-memory)
[![npm total downloads](https://img.shields.io/npm/dt/n2n-memory)](https://www.npmjs.com/package/n2n-memory)
[![license](https://img.shields.io/github/license/n2ns/n2n-memory)](https://github.com/n2ns/n2n-memory/blob/main/LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue)](https://modelcontextprotocol.io)
[![node version](https://img.shields.io/node/v/n2n-memory)](https://nodejs.org)
[![DataFrog.io](https://datafrog.io/badges/datafrog.svg)](https://datafrog.io)

[中文版](./docs/README_zh.md)

---

> **Context as code. Memory as asset.**

n2n-memory is an open-source, local-first Model Context Protocol (MCP) memory server for AI coding assistants. It prevents cross-project memory pollution by storing durable project knowledge in `.mcp/memory.json` and active task context in `.mcp/context.json` inside each repository.

### Search-friendly positioning

If you are searching for:
- AI coding memory
- project-local MCP memory
- local-first context memory for coding agents
- repository-isolated memory graph for Claude/Cursor/VS Code workflows

This server is designed for these goals: deterministic JSON output, project isolation, and Git-friendly reviewability.

## What Is n2n-memory?

n2n-memory gives AI coding tools a project-local knowledge graph they can read and update through MCP. It is designed for developers and teams who use AI assistants across multiple repositories and want memory that is local, auditable, Git-friendly, and not mixed with unrelated projects.

**TL;DR**
- **Install**: `npx -y n2n-memory`
- **Protocol**: Model Context Protocol (MCP), stdio transport
- **Storage**: `.mcp/memory.json` for durable memory, `.mcp/context.json` for active task state
- **Best for**: AI coding assistant memory, project architecture notes, shared team context
- **Not for**: cloud sync, global personal memory, source code indexing, or vector database replacement

### 🌟 Key Highlights
- **Project-Level Physical Isolation**: Memory and active context are stored under `[Project Root]/.mcp/`.
- **Git-Friendly**: JSON data is automatically sorted by key to generate clean and readable `git diff`.
- **Dual-Buffer State**: Durable graph knowledge lives in `memory.json`; high-frequency task state lives in `context.json`.
- **Tool Agnostic**: Uses the `.mcp` naming convention, not tied to any specific AI brand or IDE plugin.
- **Assets for Your Code**: Memory stays with your code; team members can share AI's understanding of the architecture by simply pulling the repository.
- **Universal Compatibility**: Works with MCP-enabled clients and AI coding tools that support stdio MCP servers.
- **Privacy-First**: Built with security by design, keeping your data local and isolated.

## Use Cases

- Restore project context at the start of an AI coding session.
- Preserve architecture decisions, implementation notes, known pitfalls, and active task state.
- Share durable project memory with teammates through Git.
- Keep memory isolated per repository when working across many client, product, or open-source projects.
- Query a local project knowledge graph without adding a database or cloud service.

## How It Compares

| Approach | Best for | Tradeoff |
| --- | --- | --- |
| n2n-memory | Project-local MCP memory for AI coding agents | Requires assistants to call MCP tools intentionally |
| Global MCP memory | Personal memory across many chats or projects | Can mix unrelated project context |
| Markdown memory bank | Human-readable project notes | Less structured for graph queries and tool updates |
| Vector database memory | Semantic retrieval over large corpora | Heavier infrastructure and less deterministic diffs |
| IDE-specific rules | Steering assistant behavior in one IDE | Less portable across MCP clients |

### 🚀 Quick Start

#### 1. Installation & Config (IDE / Claude Desktop)

The easiest way to use this is via `npx`:

##### Claude Desktop
File Path: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "n2n-memory": {
      "command": "npx",
      "args": ["-y", "n2n-memory"]
    }
  }
}
```

##### Cursor / VSCode (MCP Plugin)
Add in the MCP settings panel:
- **Name**: `n2n-memory`
- **Type**: `command`
- **Command**: `npx -y n2n-memory`

##### Other MCP clients
- The server uses stdio MCP and can be wired to any MCP client that supports local command execution.
- If your client supports it, set `N2N_LOG_LEVEL=debug` only when troubleshooting local path resolution.

#### 2. Usage Guide

This service is path-driven. AI assistants should pay attention to:

1. **Absolute Project Root**: When calling any `n2n_*` tool, provide the absolute path of the current project root or workspace top-level directory (`projectPath`).
2. **Initialization Handshake**: If `.mcp` does not exist yet, call the tool again with `confirmNewProjectRoot` set to the detected root returned by the server.
3. **Auto Storage**: Durable memory is saved to `[ProjectPath]/.mcp/memory.json`; active task context is saved to `[ProjectPath]/.mcp/context.json`.
4. **Collaboration**: Commit `.mcp/memory.json` when the knowledge graph should be shared with the team. Commit `context.json` only if your workflow wants active task state shared.

Recommended `.gitignore` policy for teams that want to share durable memory:

```gitignore
.mcp/context.json
!.mcp/
!.mcp/memory.json
```

If your project memory may contain private implementation details, keep the whole `.mcp/` directory ignored.

##### Available Tools:
- `n2n_add_entities`: Create new entities.
- `n2n_add_observations`: Append observations or facts.
- `n2n_create_relations`: Establish connections between existing entities.
- `n2n_read_graph`: Read project memory and active context (Supports `summaryMode` and `pagination`).
- `n2n_get_graph_summary`: Quickly fetch a lightweight index of all entities (Supports `pagination`).
- `n2n_update_context`: Update current task status and next steps.
- `n2n_search`: Search the graph via keyword or fuzzy matching (Supports `pagination`).
- `n2n_delete_entities`: Remove entities and their attached relations.
- `n2n_delete_observations`: Remove specific observations from entities.
- `n2n_delete_relations`: Remove specific relations.
- `n2n_open_nodes`: Retrieve specific entities by name.
- `n2n_export_markdown`: Export the graph to a Markdown file inside the project root.

##### Safety Notes:
- Existing but unreadable JSON files are treated as data integrity errors, not as empty memory.
- Export paths must be relative and must stay inside the project root.
- Relations that point to missing entities are rejected.
- Generic README-only folders are not treated as project roots; use a real project marker such as `.git`, `package.json`, or language-specific build files.
- Full local paths are hidden from server logs by default. Set `N2N_LOG_LEVEL=debug` when diagnosing path issues.

### 🗺️ Future Roadmap
- **Semantic Search**: Integration of minimalist Vector Embeddings for fuzzy memory retrieval.
- **Ontology Enforcement**: Optional schema for relation type consistency.
- **Time Travel**: Versioned snapshots for memory rollback.

## Security and governance notes

- `n2n_delete_entities`, `n2n_delete_observations`, and `n2n_delete_relations` are destructive and should be governed by review workflows.
- Keep `context.json` uncommitted by default, and commit `.mcp/memory.json` only when team sharing is intentional.
- See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

### Search disambiguation note

`n2n-memory` is not a network VPN or mesh overlay project. It is an MCP memory server for AI coding agents.

## FAQ

### Is n2n-memory a vector database?

No. n2n-memory stores a deterministic JSON knowledge graph. Semantic search may be added later, but the core design is structured, Git-friendly project memory.

### Should I commit `.mcp/memory.json`?

Commit `.mcp/memory.json` when the knowledge graph is useful to your team. Keep it ignored if it may contain private implementation details. `context.json` is active task state and is often better left uncommitted.

### Does n2n-memory send data to the cloud?

No. n2n-memory is a local MCP server. It reads and writes files under your project directory.

### How is this different from global memory?

Global memory follows the assistant or user across contexts. n2n-memory follows the repository, so unrelated projects do not contaminate each other's memory.

### Does it work with Claude Desktop, Cursor, and VS Code?

Yes, when the client supports stdio MCP servers. The README includes Claude Desktop and Cursor / VS Code MCP configuration examples.

### Is this the same as a global AI memory store?

No. This is a repository-scoped memory server. Each project gets its own `.mcp` workspace.

---

## 📖 Related Docs

- **[Design Solution](./docs/DESIGN.md)**: Why project-level isolation?
- **[API Reference](./docs/API_REFERENCE.md)**: Tool descriptions and schema.
- **[Development](./docs/DEVELOPMENT.md)**: How to build, test and extend.
- **[Changelog](./CHANGELOG.md)**: Version history and incident recovery.
- **[llms.txt](./llms.txt)**: Short AI-readable project summary for coding agents and answer engines.

## 📄 License
This project is licensed under the [MIT License](./LICENSE).

---

Built by N2NS Lab, short for Next-to-Native Systems Lab, Datafrog's open-source lab for practical AI developer tools.
