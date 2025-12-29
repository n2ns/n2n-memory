# n2n-memory

[![npm version](https://img.shields.io/npm/v/@datafrog-io/n2n-memory)](https://www.npmjs.com/package/@datafrog-io/n2n-memory)
[![npm total downloads](https://img.shields.io/npm/dt/@datafrog-io/n2n-memory)](https://www.npmjs.com/package/@datafrog-io/n2n-memory)
[![license](https://img.shields.io/github/license/n2ns/n2n-memory)](https://github.com/n2ns/n2n-memory/blob/main/LICENSE)
[![MCP Protocol](https://img.shields.io/badge/MCP-Protocol-blue)](https://modelcontextprotocol.io)
[![node version](https://img.shields.io/node/v/@datafrog-io/n2n-memory)](https://nodejs.org)
[![N2N Synthetics](https://datafrog.io/badges/n2n-synthetics.svg)](https://github.com/n2ns)
[![DataFrog.io](https://datafrog.io/badges/datafrog.svg)](https://datafrog.io)

[English](../README.md)

---

> **上下文即代码，记忆即资产。**

这是一个专为解决 AI 跨项目开发时“记忆污染”而设计的 MCP 服务。它将 AI 的认知碎片持久化在每个项目自己的目录下。

### 🌟 核心亮点
- **项目级物理隔离**: 记忆文件存储在 `[项目根目录]/.mcp/memory.json`。
- **Git 版本可控**: 自动对 JSON 数据进行字典序排序，生成清晰的 `git diff`。
- **工具中立**: 使用 `.mcp` 命名，不绑定任何特定 AI 品牌或 IDE 插件。
- **知识资产化**: 记忆随代码走，团队成员拉取仓库即可共享 AI 对架构的理解。
- **全模型支持**: 完美适配 **Claude 4.5**, **Gemini 3 Pro/Flash**, **GPT-5/5.2** 以及 **DeepSeek V3.2**。
- **隐私设计**: 隐私保护是核心原则，采用物理隔离确保数据安全。

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
- `n2n_read_graph`: 读取项目图谱及活跃上下文（支持 `summaryMode` 及分页）。
- `n2n_get_graph_summary`: 快速获取实体索引摘要（支持分页）。
- `n2n_update_context`: 更新当前任务状态及后续计划。
- `n2n_search`: 关键词搜索图谱（支持分页）。
- `n2n_open_nodes`: 按名称精确检索特定节点。

### 🗺️ 未来蓝图
- **语义搜索**: 集成极简向量嵌入 (Vector Embeddings)，实现模糊记忆检索。
- **本体校验**: 可选的关系类型 Schema，确保知识图谱一致性。
- **时间旅行**: 内存版本快照，支持误操作回滚。

---

## 📖 相关文档

- **[设计方案](./DESIGN_zh.md)**: 为什么需要项目级隔离？
- **[API 参考手册](./API_REFERENCE_zh.md)**: 工具描述和 Schema。
- **[开发指南](./DEVELOPMENT_zh.md)**: 如何构建、测试和扩展。
- **[变更日志](./CHANGELOG_zh.md)**: 版本演进与故障记录。

## 📄 许可证
本项目采用 [MIT 许可证](../LICENSE)。

---

**N2N Studio** — [DataFrog.io](https://datafrog.io) 旗下的核心创新实验室。
