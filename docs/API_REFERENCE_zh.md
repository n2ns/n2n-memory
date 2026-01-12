# n2n-memory API 参考手册

[English](./API_REFERENCE.md)

---

本项目提供了一套基于项目本地路径的知识图谱管理工具。所有工具均要求传入 `projectPath` 以确保记忆的物理隔离。

---

## 资源与模板 (Resources & Templates)

N2N-Memory 通过静态资源和动态资源模板公开项目记忆，以便 AI 助手更好地发现。

### 1. 静态资源
- **URI**: `mcp://memory/graph`
- **注意**: 要求客户端手动管理项目路径上下文，或使用下方的模板。

### 2. 资源模板 (推荐)
- **模板**: `mcp://memory/graph?path={path}`
- **用法**: 允许 AI 助手通过提供绝对项目路径作为模板参数，动态获取知识图谱。
- **示例**: `mcp://memory/graph?path=/home/deploy/projects/n2n-memory`

---

---

## 工具响应与元数据 (Metadata)

所有 N2N-Memory 工具均返回结构化的 JSON 响应，以确保机器可读性并强制执行同步协议。

### 成功响应格式
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

### 基础设施元数据 (`_protocol`)
`_protocol` 字段是用于在开发周期内引导 AI 助手的强制性元数据对象。它包含：
- `action`: 逻辑状态变更（如 `MEMORY_LOADED`, `CONTEXT_SYNCED`）。
- `reminder`: 给 AI 的协议提示（如同步提醒）。
- `policy`: 特定上下文的行为规则。

---

## 数据存储规范
- **存储位置**: `.mcp/memory.json` (冷数据) 与 `.mcp/context.json` (热数据)。
- **持久化策略**: 所有列表自动执行字典序排序，确保 `git diff` 清晰且可预测。
