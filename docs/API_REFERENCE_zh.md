# n2n-memory API 参考手册

[English](./API_REFERENCE.md)

---

N2N-Memory 通过 MCP 提供项目本地知识图谱工具。所有工具都要求传入 `projectPath`，即项目根目录或工作区顶级目录的绝对路径。服务不会递归向上搜索父目录，这是为了避免跨项目记忆污染。

项目识别要求存在 `.git`、`.mcp`、`package.json`、`tsconfig.json` 或语言构建文件等强标记。只有 README 的目录会被视为弱根目录并被拒绝。

## SEO 与可发现性说明

- 推荐检索词：**项目级 MCP memory**、**AI 编码记忆图谱**、**本地优先 AI 上下文存储**。
- 主要使用意图：仓库上下文恢复、确定性的项目记忆、与 AI 编码助手的安全交接。
- 本 API 采用本地优先设计，不依赖云端服务。

## 共享参数

所有工具都包含：

- `projectPath`（`string`，必填）：项目根目录或工作区顶级目录的绝对路径。
- `confirmNewProjectRoot`（`string`，可选）：仅在初始化尚未创建 `.mcp` 的项目时使用。取值应为握手响应中的 `detectedRoot`。

如果服务识别到项目根目录，但 `.mcp` 尚不存在，会返回 `AWAITING_CONFIRMATION` 错误响应。此时使用同一个工具再次调用，并将 `confirmNewProjectRoot` 设置为返回的 `detectedRoot`。

## 数据存储

- 冷知识图谱：`.mcp/memory.json`
- 热任务上下文：`.mcp/context.json`
- 原子写入：JSON 先写入临时文件，再移动到目标位置。
- 稳定 diff：写入图谱前会对实体、观测事实、关系执行排序。
- 数据完整性：已存在但无法读取的 JSON 文件会抛错，不会被当成空记忆。
- 路径边界：导出文件必须保留在项目根目录内部。
- 日志：服务日志默认隐藏完整本地路径。排查问题时可设置 `N2N_LOG_LEVEL=debug` 输出完整路径。

## 数据模型

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

关系必须指向已存在实体。指向不存在实体的孤儿关系会被拒绝。

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

`updatedAt` 由服务在写入上下文时自动维护。

## 资源与模板

### 静态资源
- **URI**: `mcp://memory/graph`
- **注意**: 要求客户端手动管理项目路径上下文，或使用下方的资源模板。

### 资源模板
- **模板**: `mcp://memory/graph?path={path}`
- **示例**: `mcp://memory/graph?path=/home/deploy/projects/n2n-memory`
- **行为**: 对已初始化项目返回完整图谱与活跃上下文。新项目必须通过工具完成确认握手，因为资源读取无法携带初始化确认参数。

## 工具响应与元数据

多数写入工具返回结构化 JSON：

```json
{
  "status": "success",
  "message": "操作的人类可读描述。",
  "_protocol": {
    "action": "MEMORY_UPDATED",
    "reminder": "Remember to call n2n_update_context before 'git commit'."
  }
}
```

`_protocol` 字段用于在开发周期内引导 AI 助手：

- `action`：逻辑状态变更，例如 `MEMORY_LOADED`、`MEMORY_UPDATED` 或 `CONTEXT_SYNCED`。
- `reminder`：给 AI 助手的同步提醒。
- `policy` / `tip`：存在时表示特定上下文下的行为提示。

## 常见使用流程

1. 会话开始时先调用 `n2n_read_graph`，可用 `summaryMode: true` 获取项目实体索引。
2. 用 `n2n_add_entities`、`n2n_add_observations` 写入长期事实。
3. 用 `n2n_create_relations` 建立关系。
4. 在关键阶段用 `n2n_update_context` 记录任务进展。
5. 提交前再次调用 `n2n_read_graph`，让上下文同步提醒保持最新。

`n2n_update_context` 示例：

```json
{
  "projectPath": "/absolute/path/to/repo",
  "activeTask": "重构 MCP 错误处理",
  "status": "IN_PROGRESS",
  "nextSteps": ["运行测试", "更新文档"],
  "reason": "在不改动外部行为的前提下优化上下文"
}
```

## 工具

### `n2n_add_entities`

创建新实体，或将观测事实合并到同名实体。

额外输入：

- `entities`（`Entity[]`，必填）

说明：

- 已存在实体的 `entityType` 会保留。
- 观测事实会通过轻量相似度规则去重。

### `n2n_add_observations`

向已存在实体追加观测事实。

额外输入：

- `observations`（`Array<{ entityName: string; contents: string[] }>`，必填）

说明：

- 指向不存在实体的观测事实会被跳过。
- 响应会报告去重后实际新增的观测事实数量。

### `n2n_create_relations`

在已存在实体之间创建有向关系。

额外输入：

- `relations`（`Relation[]`，必填）

说明：

- 重复关系会被忽略。
- 指向不存在实体的关系会被拒绝。

### `n2n_read_graph`

同时读取项目知识图谱和活跃上下文。

额外输入：

- `summaryMode`（`boolean`，可选）：只返回实体名称和类型，不返回观测事实。
- `limit`（`number`，可选）：最多返回多少个实体。
- `offset`（`number`，可选）：跳过多少个实体。

输出包含：

- `graph`
- `context`
- `totalEntityCount`
- `isTruncated`
- `_protocol`

分页读取时，只有当关系两端实体都在当前页中，该关系才会返回。

### `n2n_get_graph_summary`

返回轻量实体索引和关系总数。

额外输入：

- `limit`（`number`，可选）
- `offset`（`number`，可选）

输出包含：

- `entities`：`{ name, type }[]`
- `relationCount`
- `totalEntityCount`
- `isTruncated`

### `n2n_update_context`

更新热任务上下文。

额外输入：

- `activeTask`（`string`，可选）
- `status`（`"IN_PROGRESS" | "COMPLETED" | "BLOCKED" | "PLANNING"`，可选）
- `reason`（`string`，可选）
- `nextSteps`（`string[]`，可选）
- `lastCommit`（`string`，可选）

说明：

- 更新会与当前上下文合并。
- `updatedAt` 会自动写入。

### `n2n_search`

按实体名称、类型、观测事实搜索图谱。默认启用模糊匹配。

额外输入：

- `query`（`string`，必填）
- `limit`（`number`，可选）
- `offset`（`number`，可选）
- `fuzzy`（`boolean`，可选，默认 `true`）
- `minScore`（`number`，可选，默认 `0.3`）

输出包含匹配实体、相关关系、`totalResults` 与 `isTruncated`。

### `n2n_delete_entities`

删除实体及其关联关系。

额外输入：

- `entityNames`（`string[]`，必填）

输出会报告删除的实体数量。

### `n2n_delete_observations`

从实体中删除精确匹配的观测事实字符串。

额外输入：

- `deletions`（`Array<{ entityName: string; observations: string[] }>`，必填）

输出会报告删除的观测事实数量。

### `n2n_delete_relations`

删除精确匹配的关系三元组。

额外输入：

- `relations`（`Relation[]`，必填）

输出会报告删除的关系数量。

### `n2n_open_nodes`

按名称读取指定实体。

额外输入：

- `names`（`string[]`，必填）

输出包含匹配实体，以及两端都在返回实体集合内的关系。

### `n2n_export_markdown`

将图谱导出为 Markdown，便于审阅或生成文档。

额外输入：

- `outputPath`（`string`，可选）：项目根目录内的相对输出路径，默认 `KNOWLEDGE_GRAPH.md`。

说明：

- 绝对路径会被拒绝。
- 试图逃逸项目根目录的相对路径会被拒绝。
