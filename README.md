# n2n-memory

[![npm version](https://img.shields.io/npm/v/@datafrog-io/n2n-memory)](https://www.npmjs.com/package/@datafrog-io/n2n-memory)
[![npm total downloads](https://img.shields.io/npm/dt/@datafrog-io/n2n-memory)](https://www.npmjs.com/package/@datafrog-io/n2n-memory)
[![license](https://img.shields.io/github/license/n2ns/n2n-memory)](https://github.com/n2ns/n2n-memory/blob/main/LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue)](https://modelcontextprotocol.io)
[![node version](https://img.shields.io/node/v/@datafrog-io/n2n-memory)](https://nodejs.org)
<a href="https://github.com/n2ns"><img src="https://datafrog.io/badges/n2n-synthetics.svg" height="20" alt="N2N Synthetics"></a>
<a href="https://datafrog.io"><img src="https://datafrog.io/badges/datafrog.svg" height="20" alt="DataFrog.io"></a>

[中文版](./docs/README_zh.md)

---

> **Context as code. Memory as asset.**

A specialized MCP server designed to solve "memory pollution" during AI-assisted cross-project development. It persists AI's cognitive fragments directly within each project's own directory.

### 🌟 Key Highlights
- **Project-Level Physical Isolation**: Memory files are stored at `[Project Root]/.mcp/memory.json`.
- **Git-Friendly**: JSON data is automatically sorted by key to generate clean and readable `git diff`.
- **Tool Agnostic**: Uses the `.mcp` naming convention, not tied to any specific AI brand or IDE plugin.
- **Assets for Your Code**: Memory stays with your code; team members can share AI's understanding of the architecture by simply pulling the repository.
- **Universal Compatibility**: Works with all MCP-enabled models including **Claude 4.5**, **Gemini 3 Pro/Flash**, **GPT-5/5.2**, and **DeepSeek V3.2**.
- **Privacy-First**: Built with security by design, keeping your data local and isolated.

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
      "args": ["-y", "@datafrog-io/n2n-memory"]
    }
  }
}
```

##### Cursor / VSCode (MCP Plugin)
Add in the MCP settings panel:
- **Name**: `n2n-memory`
- **Type**: `command`
- **Command**: `npx -y @datafrog-io/n2n-memory`

#### 2. Usage Guide

This service is path-driven. AI assistants should pay attention to:

1. **Absolute Paths**: When calling any `n2n_*` tool, the absolute path of the current project root (`projectPath`) must be provided.
2. **Auto Storage**: Memory is automatically saved to `[ProjectPath]/.mcp/memory.json`.
3. **Collaboration**: It is recommended to commit `.mcp/memory.json` to your Git repository to share the knowledge graph with your team.

##### Available Tools:
- `n2n_add_entities`: Create new entities.
- `n2n_add_observations`: Append observations or facts.
- `n2n_create_relations`: Establish connections between entities.
- `n2n_read_graph`: Read project memory and active context (Supports `summaryMode` and `pagination`).
- `n2n_get_graph_summary`: Quickly fetch a lightweight index of all entities (Supports `pagination`).
- `n2n_update_context`: Update current task status and next steps.
- `n2n_search`: Search the graph via keywords (Supports `pagination`).
- `n2n_open_nodes`: Retrieve specific entities by name.

### 🗺️ Future Roadmap
- **Semantic Search**: Integration of minimalist Vector Embeddings for fuzzy memory retrieval.
- **Ontology Enforcement**: Optional schema for relation type consistency.
- **Time Travel**: Versioned snapshots for memory rollback.

---

## 📖 Related Docs

- **[Design Solution](./docs/DESIGN.md)**: Why project-level isolation?
- **[API Reference](./docs/API_REFERENCE.md)**: Tool descriptions and schema.
- **[Development](./docs/DEVELOPMENT.md)**: How to build, test and extend.
- **[Changelog](./CHANGELOG.md)**: Version history and incident recovery.

## 📄 License
This project is licensed under the [MIT License](./LICENSE).

---

**N2N Studio** — The AI Innovation Lab of [DataFrog.io](https://datafrog.io).
