# N2N 记忆 (N2N Memory) MCP 服务

这是一个专为解决 AI 跨项目开发时“记忆污染”而设计的 MCP 服务。它将 AI 的认知碎片持久化在每个项目自己的目录下。

## 核心亮点
- **项目级物理隔离**: 记忆文件存储在 `[项目根目录]/.mcp/memory.json`。
- **Git 版本可控**: 自动对 JSON 数据进行字典序排序，生成清晰的 `git diff`。
- **工具中立**: 使用 `.mcp` 命名，不绑定任何特定 AI 品牌或 IDE 插件。
- **资产化**: 记忆随代码走，团队成员拉取仓库即可共享 AI 对架构的理解。

## 快速配置

### 1. JSON 配置 (IDE / Claude Desktop)

根据您使用的客户端，在相应的 MCP 配置文件中添加以下内容：

#### Claude Desktop
配置文件路径: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "n2n-memory": {
      "command": "node",
      "args": ["D:/DevSpace/MCP_N2N_Memory/build/index.js"]
    }
  }
}
```

#### Cursor / VSCode (MCP 插件)
在 MCP 设置面板中添加：
- **Name**: `n2n-memory`
- **Type**: `command`
- **Command**: `node D:/DevSpace/MCP_N2N_Memory/build/index.js`

### 2. 使用指南 (Usage Guide)

本服务完全由路径驱动，AI 助手在调用工具时需要关注以下几点：

1. **绝对路径**: 调用任何 `n2n_*` 工具时，必须传入当前项目根目录的**绝对路径**（`projectPath`）。
2. **自动存储**: 记忆将自动保存在 `[项目路径]/.mcp/memory.json`。
3. **协作共享**: 建议将 `.mcp/memory.json` 提交至 Git 仓库，以便团队成员共享 AI 对代码架构的理解。

#### 常用场景指令示例：
- `n2n_add_entities`: 创建新实体。
- `n2n_add_observations`: 追加观测事实。
- `n2n_create_relations`: 建立实体间联系。
- `n2n_read_graph`: 读取完整图谱。
- `n2n_search`: 关键词搜索图谱（支持实体名、类型、观测事实）。
- *"将这个新发现的 Bug 记录到内存中"* -> AI 将调用 `n2n_add_observations`。

## 文档指引 (Docs)

- **[设计方案](./docs/DESIGN.md)**: 了解为什么要进行物理隔离以及核心架构设计。
- **[API 参考手册](./docs/API_REFERENCE.md)**: 详细描述了可用的 Tool 及其参数结构。
- **[开发与维护](./docs/DEVELOPMENT.md)**: 指导如何构建、测试和扩展本项目。

## 许可证
本项目采用 [ISC 许可证](./LICENSE)。
