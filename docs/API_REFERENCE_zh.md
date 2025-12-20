# n2n-memory API 参考手册

[English](./API_REFERENCE.md)

---

本项目提供了一套基于项目本地路径的知识图谱管理工具。所有工具均要求传入 `projectPath` 以确保记忆的物理隔离。

## 初始化与握手 (Handshake)

N2N-Memory 执行严格的项目根目录策略。记忆仅能在包含项目标志（如 `.git`, `package.json`）的目录中初始化。

1. **检测**: 首次调用时，服务器会自动识别根目录。
2. **确认**: 若为新项目，服务器返回 `AWAITING_CONFIRMATION`。AI 必须携带 `confirmNewProjectRoot` 参数再次调用以完成初始化。

---

## 核心工具集

### 1. `n2n_add_entities`
向项目的知识图谱中添加新的实体（名词/概念）。

**输入参数:**
- `projectPath` (string): 项目根目录的绝对路径。
- `entities` (Array): 实体对象列表 `{ name, entityType, observations }`。

---

### 2. `n2n_read_graph`
读取指定项目的完整知识图谱及活跃上下文。

**输入参数:**
- `projectPath` (string): 项目根目录的绝对路径。
- `summaryMode` (boolean, 可选): 若为 true，则不返回观测事实（observations），仅返回结构。
- `limit` (number, 可选): 限制返回的实体数量。
- `offset` (number, 可选): 分页偏移量。

**返回:**
- `graph`: 包含实体和关系的图谱。
- `context`: 活跃任务状态及后续计划。
- `totalEntityCount`: 项目实体总数。
- `isTruncated`: 是否还有更多数据（分页标志）。

---

### 3. `n2n_get_graph_summary`
快速获取项目中所有实体的轻量级索引。

**输入参数:**
- `projectPath` (string): 绝对路径。
- `limit` / `offset` (可选): 分页参数。

**返回:**
- 实体名录 `{ name, type }` 列表及关系总数。

---

### 4. `n2n_update_context`
更新项目的“热数据”状态（任务状态、下一步计划）。

**输入参数:**
- `status` (枚举): `PLANNING`, `IN_PROGRESS`, `COMPLETED`, `BLOCKED`。
- `nextSteps` (string[]): 后续计划。

---

### 5. `n2n_search`
支持分页的关键词搜索。

**输入参数:**
- `query` (string): 搜索关键词。
- `limit` / `offset` (可选): 分页参数。

---

### 6. `n2n_open_nodes`
按名称精确检索特定实体，用于聚焦特定上下文。

---

## 数据存储规范
- **存储位置**: `.mcp/memory.json` (冷数据) 与 `.mcp/context.json` (热数据)。
- **持久化策略**: 所有列表自动执行字典序排序，确保 `git diff` 清晰且可预测。
