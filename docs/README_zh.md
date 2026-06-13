# n2n-memory

面向 AI 编程代理的项目本地记忆 MCP Server。

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

n2n-memory 是一个开源、local-first 的 Model Context Protocol (MCP) 记忆服务，面向 AI 编程助手和 AI coding agents。它通过把长效项目知识存储在 `.mcp/memory.json`，把活跃任务上下文存储在 `.mcp/context.json`，避免跨项目记忆污染。

### SEO 友好定位

如果你在搜索：
- AI 编码记忆
- 项目级 MCP memory
- coding agent 的本地上下文记忆
- 适配 Claude/Cursor/VS Code 的仓库隔离记忆

本项目聚焦于：可审计的 JSON、仓库隔离、以及可读的 Git diff。

## n2n-memory 是什么？

n2n-memory 为 AI 编程工具提供一个可通过 MCP 读写的项目本地知识图谱。它适合经常在多个仓库之间切换、希望记忆跟随代码仓库而不是跟随全局助手账户的开发者和团队。

**快速摘要**
- **安装**: `npx -y @datafrog-io/n2n-memory`
- **协议**: Model Context Protocol (MCP)，stdio transport
- **存储**: `.mcp/memory.json` 保存长效记忆，`.mcp/context.json` 保存活跃任务状态
- **适合**: AI 编程助手记忆、项目架构笔记、团队共享上下文
- **不适合**: 云同步、全局个人记忆、源码索引替代、向量数据库替代

### 🌟 核心亮点
- **项目级物理隔离**: 记忆与活跃上下文都存储在 `[项目根目录]/.mcp/` 下。
- **Git 版本可控**: 自动对 JSON 数据进行字典序排序，生成清晰的 `git diff`。
- **冷热双缓冲**: 长效知识图谱存储在 `memory.json`，高频任务状态存储在 `context.json`。
- **工具中立**: 使用 `.mcp` 命名，不绑定任何特定 AI 品牌或 IDE 插件。
- **知识资产化**: 记忆随代码走，团队成员拉取仓库即可共享 AI 对架构的理解。
- **通用兼容**: 适配支持 stdio MCP Server 的 MCP 客户端与 AI 编程工具。
- **隐私设计**: 隐私保护是核心原则，采用物理隔离确保数据安全。

## 典型场景

- 在 AI 编程会话开始时恢复项目上下文。
- 保存架构决策、实现说明、踩坑记录和当前任务状态。
- 通过 Git 与团队共享长效项目记忆。
- 在多个客户项目、产品项目或开源项目之间工作时保持记忆隔离。
- 不引入数据库或云服务，也能查询项目本地知识图谱。

## 与其他方案的区别

| 方案 | 适合场景 | 取舍 |
| --- | --- | --- |
| n2n-memory | 面向 AI 编程代理的项目本地 MCP 记忆 | 需要助手按工作流主动调用 MCP 工具 |
| 全局 MCP memory | 跨聊天或跨项目的个人记忆 | 容易混入无关项目上下文 |
| Markdown memory bank | 人类可读的项目笔记 | 对图谱查询和工具化更新不够结构化 |
| 向量数据库记忆 | 大规模语义检索 | 基础设施更重，Git diff 不够确定 |
| IDE 专属规则 | 在单个 IDE 中约束助手行为 | 跨 MCP 客户端的可移植性较弱 |

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

##### 其他 MCP 客户端
- 本服务使用 stdio MCP 协议，可接入任何支持本地命令启动 MCP 的客户端。
- 排查路径问题时，可在客户端环境中设置 `N2N_LOG_LEVEL=debug`。

#### 2. 使用指南 (Usage Guide)

本服务完全由路径驱动，AI 助手在调用工具时需要关注以下几点：

1. **项目根目录绝对路径**: 调用任何 `n2n_*` 工具时，必须传入当前项目根目录或工作区顶级目录的**绝对路径**（`projectPath`）。
2. **初始化握手**: 如果 `.mcp` 尚不存在，需要按服务返回的 `detectedRoot` 再次调用工具，并传入 `confirmNewProjectRoot`。
3. **自动存储**: 长效记忆保存在 `[项目路径]/.mcp/memory.json`，活跃任务上下文保存在 `[项目路径]/.mcp/context.json`。
4. **协作共享**: 建议在需要共享知识图谱时提交 `.mcp/memory.json`。是否提交 `context.json` 取决于团队是否希望共享当前任务状态。

如果团队希望共享长效记忆，推荐使用以下 `.gitignore` 策略：

```gitignore
.mcp/context.json
!.mcp/
!.mcp/memory.json
```

如果项目记忆可能包含私有实现细节，请继续忽略整个 `.mcp/` 目录。

##### 常用工具示例：
- `n2n_add_entities`: 创建新实体。
- `n2n_add_observations`: 追加观测事实。
- `n2n_create_relations`: 在已存在实体之间建立联系。
- `n2n_read_graph`: 读取项目图谱及活跃上下文（支持 `summaryMode` 及分页）。
- `n2n_get_graph_summary`: 快速获取实体索引摘要（支持分页）。
- `n2n_update_context`: 更新当前任务状态及后续计划。
- `n2n_search`: 关键词或模糊搜索图谱（支持分页）。
- `n2n_delete_entities`: 删除实体及其关联关系。
- `n2n_delete_observations`: 删除实体中的指定观测事实。
- `n2n_delete_relations`: 删除指定关系。
- `n2n_open_nodes`: 按名称精确检索特定节点。
- `n2n_export_markdown`: 将图谱导出为项目根目录内的 Markdown 文件。

##### 安全说明：
- 已存在但无法读取的 JSON 文件会被视为数据完整性错误，而不是空记忆。
- 导出路径必须是相对路径，并且必须保留在项目根目录内部。
- 指向不存在实体的关系会被拒绝。
- 只有 README 的普通目录不会被识别为项目根目录；请使用 `.git`、`package.json` 或语言构建文件等真实项目标记。
- 服务日志默认隐藏完整本地路径。排查路径问题时可设置 `N2N_LOG_LEVEL=debug`。

### 🗺️ 未来蓝图
- **语义搜索**: 集成极简向量嵌入 (Vector Embeddings)，实现模糊记忆检索。
- **本体校验**: 可选的关系类型 Schema，确保知识图谱一致性。
- **时间旅行**: 内存版本快照，支持误操作回滚。

## 安全与治理说明

- `n2n_delete_entities`、`n2n_delete_observations`、`n2n_delete_relations` 会修改或清理持久化记忆，请结合 CI 或人工流程进行保护。
- 默认建议将 `context.json` 保持未提交；只有在需要共享活跃任务状态时再提交。
- 遵循 [SECURITY.md](../SECURITY.md) 的安全问题提交流程。

### 搜索歧义说明

`n2n-memory` 与网络层 `n2n` 工具链无关，核心是面向 AI 代码助手的 MCP 记忆服务。

## FAQ

### n2n-memory 是向量数据库吗？

不是。n2n-memory 存储的是确定性的 JSON 知识图谱。未来可能加入语义检索，但核心设计是结构化、Git 友好的项目记忆。

### 应该提交 `.mcp/memory.json` 吗？

当知识图谱对团队有价值时，可以提交 `.mcp/memory.json`。如果其中可能包含私有实现细节，则应继续忽略。`context.json` 是活跃任务状态，通常更适合保持未提交。

### n2n-memory 会把数据发送到云端吗？

不会。n2n-memory 是本地 MCP server，只读写项目目录下的文件。

### 它和全局 memory 有什么不同？

全局 memory 跟随助手或用户账号，容易跨项目混用。n2n-memory 跟随代码仓库，让不同项目的记忆保持隔离。

### 它能和 Claude Desktop、Cursor、VS Code 一起用吗？

可以，只要客户端支持 stdio MCP server。本 README 提供了 Claude Desktop 和 Cursor / VS Code MCP 配置示例。

### 和全局 memory 有什么不同？

不是同一类。它按仓库作用域隔离记忆，适合多个项目切换的团队场景。

---

## 📖 相关文档

- **[设计方案](./DESIGN_zh.md)**: 为什么需要项目级隔离？
- **[API 参考手册](./API_REFERENCE_zh.md)**: 工具描述和 Schema。
- **[开发指南](./DEVELOPMENT_zh.md)**: 如何构建、测试和扩展。
- **[变更日志](./CHANGELOG_zh.md)**: 版本演进与故障记录。
- **[llms.txt](../llms.txt)**: 面向 AI 编程代理和回答引擎的简短项目摘要。

## 📄 许可证
本项目采用 [MIT 许可证](../LICENSE)。

---

Built by N2NS Lab, the open-source lab from Datafrog, focused on practical AI developer tools.
