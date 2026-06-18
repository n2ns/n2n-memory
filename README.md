<p align="center">
  <img src="./assets/n2n-memory-logo.png" width="128" alt="n2n-memory logo">
</p>

# n2n-memory

Project-local knowledge-graph memory MCP server from N2NS Lab for AI coding agents.

[![npm version](https://img.shields.io/npm/v/n2n-memory)](https://www.npmjs.com/package/n2n-memory)
[![npm total downloads](https://img.shields.io/npm/dt/n2n-memory)](https://www.npmjs.com/package/n2n-memory)
[![license](https://img.shields.io/github/license/n2ns/n2n-memory)](https://github.com/n2ns/n2n-memory/blob/main/LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue)](https://modelcontextprotocol.io)
[![node version](https://img.shields.io/node/v/n2n-memory)](https://nodejs.org)

[中文版](./docs/README_zh.md)

---

> **Context as code. Memory as asset.**

n2n-memory is an open-source, local-first Model Context Protocol (MCP) memory server for AI coding assistants. It prevents cross-project memory pollution by storing durable project knowledge in `.mcp/memory.json` and active task context in `.mcp/context.json` inside each repository.

## 📚 Contents

- [What is n2n-memory?](#-what-is-n2n-memory)
- [Quick start](#-quick-start)
- [Configuration](#️-configuration)
- [Security and governance notes](#-security-and-governance-notes)
- [Related docs](#-related-docs)

## 💡 What is n2n-memory?

n2n-memory gives AI coding tools a project-local knowledge graph they can read and update through MCP. Memory and context are stored inside each repository under `.mcp/`, keeping them isolated, Git-friendly, and reviewable.

- Restore project context at the start of an AI coding session.
- Preserve architecture decisions, implementation notes, and known pitfalls.
- Share durable project memory with teammates through Git.
- Keep memory isolated per repository when working across many projects.

## 🚀 Quick start

### 1. Configure your MCP client

#### Claude Desktop
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

#### Cursor / VS Code
Add in the MCP settings panel:
- **Name**: `n2n-memory`
- **Type**: `command`
- **Command**: `npx -y n2n-memory`

#### Other MCP clients
- The server uses stdio MCP and can be wired to any MCP client that supports local command execution.
- If your client supports it, set `N2N_LOG_LEVEL=debug` only when troubleshooting local path resolution.

### 2. Usage guide

This service is path-driven. AI assistants should pay attention to:

1. **Absolute Project Root**: When calling any `n2n_*` tool, provide the absolute path of the current project root or workspace top-level directory (`projectPath`).
2. **Initialization Handshake**: The first call in a project that has no `.mcp/` yet does **not** create anything. The server detects the project root and replies with `status: "AWAITING_CONFIRMATION"` and a `detectedRoot`. Call the same tool again with `confirmNewProjectRoot` set to that exact `detectedRoot` to initialize memory. Folders without a real project marker (`.git`, `package.json`, language build files, …) are rejected outright, so memory is never created in an arbitrary directory.
3. **Auto Storage**: Durable memory is saved to `[ProjectPath]/.mcp/memory.json`; active task context is saved to `[ProjectPath]/.mcp/context.json`.
4. **Collaboration**: Commit `.mcp/memory.json` when the knowledge graph should be shared with the team. Commit `context.json` only if your workflow wants active task state shared.

Storage layout inside each project:

```text
<project-root>/
└── .mcp/
    ├── memory.json    # durable knowledge graph — commit to share with the team
    └── context.json   # active task context — usually kept local
```

Recommended `.gitignore` policy for teams that want to share durable memory:

```gitignore
.mcp/context.json
!.mcp/
!.mcp/memory.json
```

If your project memory may contain private implementation details, keep the whole `.mcp/` directory ignored.

#### Available tools

- **Graph writes** (`n2n_add_entities`, `n2n_add_observations`, `n2n_create_relations`): add entities, observations, and relations to build the knowledge graph.
- **Graph reads** (`n2n_read_graph`, `n2n_get_graph_summary`, `n2n_search`, `n2n_open_nodes`): read the full graph, get a lightweight summary, search, or open specific entities.
- **Context** (`n2n_update_context`): update active task state before commits and handoffs.
- **Maintenance** (`n2n_delete_entities`, `n2n_delete_observations`, `n2n_delete_relations`, `n2n_export_markdown`): delete entities, observations, or relations; export the graph to Markdown.

See [Tools reference](./docs/TOOLS_REFERENCE.md) for parameter schemas and usage notes.

## ⚙️ Configuration

n2n-memory runs as a stdio MCP server with no CLI subcommands — start it with `npx -y n2n-memory` (or `n2n-memory` once installed). Storage location is derived from the `projectPath` you pass to each tool, not from configuration.

| Variable | Description | Default |
| --- | --- | --- |
| `N2N_LOG_LEVEL` | Set to `debug` to enable verbose logs when diagnosing local path resolution. Any other value (or unset) uses normal logging with full local paths hidden. | unset |

## 🔐 Security and governance notes

- `n2n_delete_entities`, `n2n_delete_observations`, and `n2n_delete_relations` are destructive and should be governed by review workflows.
- Keep `context.json` uncommitted by default, and commit `.mcp/memory.json` only when team sharing is intentional.
- Existing but unreadable JSON files are treated as data integrity errors, not as empty memory.
- Export paths must be relative and must stay inside the project root.
- Relations that point to missing entities are rejected.
- Generic README-only folders are not treated as project roots; use a real project marker such as `.git`, `package.json`, or language-specific build files.
- Full local paths are hidden from server logs by default. Set `N2N_LOG_LEVEL=debug` when diagnosing path issues.
- See [SECURITY.md](./SECURITY.md) for vulnerability reporting.

## 📖 Related docs

- **[Design](./docs/DESIGN.md)**: Why project-level isolation?
- **[Tools reference](./docs/TOOLS_REFERENCE.md)**: MCP tool parameter schemas and usage notes.
- **[Development](./docs/DEVELOPMENT.md)**: How to build, test and extend.
- **[Roadmap](./ROADMAP.md)**: Planned features and what's coming next.
- **[Changelog](./CHANGELOG.md)**: Version history and incident recovery.
- **[Contributing](./CONTRIBUTING.md)**: How to report issues and contribute.
- **[Security](./SECURITY.md)**: How to report vulnerabilities.

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

Built by [N2NS Lab](https://n2ns.com), the open-source lab of [datafrog.io](https://datafrog.io) for practical AI developer tools.
