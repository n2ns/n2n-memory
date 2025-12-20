# n2n-memory Design Solution

[中文版](./DESIGN_zh.md)

---

## 1. Context & Objectives
To solve the "memory pollution" and hallucination issues caused by global MCP Memory Servers. By persisting AI cognitive fragments directly within the project source directory, we achieve project-level physical isolation and shared knowledge.

This project aims to develop a minimalist, tool-agnostic, and version-control-friendly memory service.

## 2. Core Architecture

### 2.1 Storage Logic
- **Location**: `[Project Root]/.mcp/memory.json`
- **Agnosticism**: Uses the `.mcp` naming convention to avoid branding ties to specific AI assistants or IDE plugins.
- **Physical Isolation**: One file per project, synchronized with project code.

### 2.2 Interaction & Security
- **Strict Root Enforcement**: Cancels recursive parent searches. AI must operate from the recognized project root or workspace top-level.
- **Handshake Protocol**: Requires explicit confirmation (`confirmNewProjectRoot`) for new project initialization to prevent directory pollution.
- **Dual-Buffer Architecture**:
    - **Hot State (`context.json`)**: Volatile, high-frequency updates (tasks, status).
    - **Cold State (`memory.json`)**: Durable, structured knowledge graph (entities, relations).

## 3. Data Structure & Retrieval

### 3.1 Minimalist Data Format
The JSON does **not** include version numbers, metadata, author info, or timestamps. Only core knowledge graph data (Entities & Relations) is kept, with auditing achieved via Git history.

### 3.2 Git-Friendly Saving Strategy
To ensure readable `git diff`:
1. **Mandatory Sorting**: Lexicographical sorting for `entities` and `relations`.
2. **Standard Indentation**: Uniform use of 2-space indentation.

### 3.3 Scalable Retrieval Mechanism
- **Pagination (Limit/Offset)**: Supports chunked reading for massive graphs to stay within token limits.
- **Summary Mode**: Optional retrieval of entity indexes without detailed observations.
- **Precise Open**: `open_nodes` for fetching specific high-detail context.

## 4. Language Efficiency Analysis (Go vs. Node.js vs. Python)

### 4.1 Node.js (TypeScript) - [Default Recommendation]
- **Efficiency**: Rapid development, most mature official SDK.
- **Performance**: More than sufficient for per-project JSON files (typically < 10MB).
- **Distribution**: Zero-install execution via `npx`.

### 4.2 Go - [Performance Selection]
- **Efficiency**: Highest runtime efficiency, minimal memory footprint (only a few MBs).
- **Distribution**: Single binary compilation for clean deployment, ideal for power users.
- **Scenario**: The only choice if future scalability requires handling ultra-large graphs with tens of thousands of nodes.

### 4.3 Python - [Not Recommended]
- **Cons**: Heavy dependencies, difficult distribution, too cumbersome for simple I/O tasks.

## 5. Summary of Benefits
- **Assetization**: Memory is source code—auditable and shareable.
- **Zero Drift**: Physical isolation eliminates cross-project pollution.
- **Determinism**: Structured data is better suited for high-precision coding decisions than vector databases.
