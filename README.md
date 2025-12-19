# n2n-memory

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## English

A specialized MCP server designed to solve "memory pollution" during AI-assisted cross-project development. It persists AI's cognitive fragments directly within each project's own directory.

### 🌟 Key Highlights
- **Project-Level Physical Isolation**: Memory files are stored at `[Project Root]/.mcp/memory.json`.
- **Git-Friendly**: JSON data is automatically sorted by key to generate clean and readable `git diff`.
- **Tool Agnostic**: Uses the `.mcp` naming convention, not tied to any specific AI brand or IDE plugin.
- **Assets for Your Code**: Memory stays with your code; team members can share AI's understanding of the architecture by simply pulling the repository.

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
- `n2n_read_graph`: Read the entire knowledge graph.
- `n2n_search`: Search the graph via keywords (names, types, observations).

---

<a name="中文"></a>
## 中文

这是一个专为解决 AI 跨项目开发时“记忆污染”而设计的 MCP 服务。它将 AI 的认知碎片持久化在每个项目自己的目录下。

### 🌟 核心亮点
- **项目级物理隔离**: 记忆文件存储在 `[项目根目录]/.mcp/memory.json`。
- **Git 版本可控**: 自动对 JSON 数据进行字典序排序，生成清晰的 `git diff`。
- **工具中立**: 使用 `.mcp` 命名，不绑定任何特定 AI 品牌或 IDE 插件。
- **知识资产化**: 记忆随代码走，团队成员拉取仓库即可共享 AI 对架构的理解。

### 🚀 快速配置

#### 1. JSON 配置 (IDE / Claude Desktop)

推荐使用 `npx` 模式直接运行：

##### Claude Desktop
配置文件路径: `%APPDATA%\Claude\claude_desktop_config.json`

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

##### Cursor / VSCode (MCP 插件)
在 MCP 设置面板中添加：
- **Name**: `n2n-memory`
- **Type**: `command`
- **Command**: `npx -y @datafrog-io/n2n-memory`

#### 2. 使用指南 (Usage Guide)

本服务完全由路径驱动，AI 助手在调用工具时需要关注以下几点：

1. **绝对路径**: 调用任何 `n2n_*` 工具时，必须传入当前项目根目录的**绝对路径**（`projectPath`）。
2. **自动存储**: 记忆将自动保存在 `[项目路径]/.mcp/memory.json`。
3. **协作共享**: 建议将 `.mcp/memory.json` 提交至 Git 仓库，以便团队成员共享知识图谱。

##### 常用工具示例：
- `n2n_add_entities`: 创建新实体。
- `n2n_add_observations`: 追加观测事实。
- `n2n_create_relations`: 建立实体间联系。
- `n2n_read_graph`: 读取完整图谱。
- `n2n_search`: 关键词搜索图谱（支持实体名、类型、观测事实）。

---

## 📖 Related Docs | 文档指引

- **[Design Solution | 设计方案](./docs/DESIGN.md)**: Why project-level isolation?
- **[API Reference | API 参考手册](./docs/API_REFERENCE.md)**: Tool descriptions and schema.
- **[Development | 开发指南](./docs/DEVELOPMENT.md)**: How to build, test and extend.

## 📄 License | 许可证
This project is licensed under the [MIT License](./LICENSE). | 本项目采用 [MIT 许可证](./LICENSE)。
