# 变更日志 (Changelog)

[English](../CHANGELOG.md)

---

本项目的所有重大变更都将记录在此文件中。

## [未发布]

### 修复 (Fixed)
- 普通读取现在会在底层 `.mcp` 文件变化时刷新已缓存的图谱/上下文 snapshot。
- 已存在但无法读取的 `memory.json` 或 `context.json` 现在会抛出数据完整性错误，不再被当成空状态。
- `n2n_create_relations` 现在会拒绝指向不存在实体的关系。
- `n2n_export_markdown` 现在会拒绝绝对输出路径，以及试图逃逸项目根目录的相对路径。
- `projectPath` 校验现在会在路径解析前拒绝相对路径。
- 生产依赖与开发依赖审计现在均可达到 0 漏洞。

### 变更 (Changed)
- 明确 `projectPath` 必须指向项目根目录或工作区顶级目录。
- 将 JSON 存储写入收敛到共享的原子写入路径，并在持久化前规范化图谱副本。
- 测试框架从 Mocha 切换到 Vitest，以保持开发依赖树干净。
- 工具发现现在会暴露由 Zod Schema 生成的具体 JSON 输入 Schema。
- 只有 README 的目录会被视为弱根目录，并在项目识别时被拒绝。
- 服务日志默认隐藏完整本地路径，除非设置 `N2N_LOG_LEVEL=debug`。
- 更新英文与中文文档，反映当前工具集、存储契约、路径边界和图谱完整性行为。

### 新增 (Added)
- 新增用于 PR 和 `main` 分支推送的 GitHub CI workflow。
- 发布 workflow 现在会在 `npm publish` 前运行完整检查。
- 新增 npm 包 `files` 白名单和更完整的 package metadata。
- 新增开源治理文件：贡献指南、安全策略、行为准则、issue 模板和 PR 模板。

## [1.2.1] - 2026-01-12

### 新增 (Added)
- **结构化 JSON 工具响应**：
  - 将工具响应从纯文本升级为结构化 JSON。
  - 新增 `status`、`message` 和 `_protocol` 元数据字段，提高机器可读性。
- **动态 N2N-SYNC 协议提醒**：
  - 自动向 `nextSteps` 注入 `[N2N-SYNC]` 协议提醒。
  - 在工具元数据中嵌入协议提示，引导 AI 助手形成更好的同步习惯。
- **基于相似度的观察去重**：
  - 新增 `similarity.ts` 工具模块，包含 Jaccard 相似度、Levenshtein 编辑距离和包含检测算法。
  - `addEntities()` 和 `addObservations()` 现在使用智能去重替代精确匹配的 `Set` 去重。
  - 检测到重复时自动保留更详细（更长）的观察记录。
  - 防止 "version 2.4.1" 和 "version 2.4.1 is the current release" 等冗余条目同时存在。

- **支持模糊搜索与相关度排序**：
  - `n2n_search` 工具现默认支持模糊匹配。
  - 新增可选参数：`fuzzy`（布尔值）和 `minScore`（0-1 阈值）。
  - 搜索结果按相关度评分排序（最相关的在前）。
  - 通过 Levenshtein 相似度处理拼写错误。
  - 支持词级别的部分匹配和基于 Jaccard 指数的语义相似度。

- **新增单元测试**：
  - 为所有相似度函数新增完整测试套件 (`similarity.test.ts`)。
  - 共 99 个测试全部通过。

## [1.1.0] - 2024-12-19

### 新增 (Added)
- 双语 README 支持：分为 `README.md`（英文）和 `docs/README_zh.md`（中文）。
- 初始化 `CHANGELOG.md` 以追踪项目演进和技术发现。
- **全文档双语化**：包括 API 参考、设计方案和开发指南，均已实现中英双语关联。
- **基础设施强化**：
  - 更新 `package.json` 中的 `engines` 字段，要求 Node.js >= 20 和 npm >= 10（与 MCP SDK 保持一致）。
  - 在 MCP Server 启动时增加了环境检查逻辑，主动提醒版本不匹配风险。
- **依赖维护**：
  - 将所有依赖项升级至最新的稳定版本（包括 `sinon`, `typescript`, `eslint` 等）。
  - 验证当前依赖为 0 漏洞且全部为最新。
- **高可靠架构演进**：
  - 实现了 **双缓存服务 (Dual-Buffer Service)**：
    - **Snapshot Buffer**：内存级快照，提供瞬时读取响应。
    - **Write Queue**：串行写入队列，并集成 `proper-lockfile` 解决多进程冲突。
  - **原子化持久化**：采用临时文件交换（Atomic Rename）机制，确保 JSON 文件完整性。
  - **AI 引导路径定位**：优化工具描述，通过 AI 助手主动报告项目路径实现“启动即加载”。
- **模块化重构与 SDK 现代化 (Clean Architecture & Modernization)**：
  - 迁移至最新的 `@modelcontextprotocol/sdk` 高级 `McpServer` API。
  - 彻底解决了 `Server` 类被弃用的警告 (TS6385)。
  - 将庞大的 `index.ts` 按照功能拆分为清晰的目录结构：
    - `/core`：核心领域逻辑（MemoryService, MemoryManager）。
    - `/tools`：工具元数据定义与 Zod Schema 校验。
    - `/handlers`：通过 `registerAll` 实现纯粹的请求分发。
    - `/utils`：环境检查等系统工具。
    - **冷热数据分离 (Project Context)**：
      - 引入 `context.json` 专门存储高频变动的“热状态”（当前任务、状态、后续步骤）。
      - 将架构级的“冷知识”隔离在 `memory.json` 中，减少数据污染。
      - 为 `context.json` 配置了独立的物理锁 (`proper-lockfile`) 和内存互斥锁 (`Mutex`)。
      - 新增工具 `n2n_update_context` 并集成了强制性的 Git 同步协议。
      - `n2n_read_graph` 现在支持“一站式读取”，同时返回知识图谱与当前上下文。
    - **N2N-SYNC 协议强制约束**：
      - 在 MCP 工具元数据中硬编码了强制性的同步约束。
      - 会话启动（`n2n_read_graph`）现在会自动绑定 AI 执行“Git 提交前更新记忆”的策略。
      - 在所有写入工具中增加了 `[MANDATORY PROTOCOL]` 和 `[HARD CONSTRAINT]` 标签，有效防止重构过程中的上下文漂移。
  - 优化了测试套件兼容性，修复了模块化后的路径引用问题。

### 修复 (Fixed)
- **NPM 发布兼容性**：识别并记录了 Trusted Publishing (OIDC) 的要求。
  - **发现**：NPM CLI 10.x 版本在 OIDC 发布时可能存在问题。
  - **建议**：使用 Node.js 20+ LTS 配合 npm 10+ 以确保发布稳定性。

## [1.0.0] - 2024-12-19 之前

### 新增 (Added)
- 项目本地记忆隔离的核心 MCP 功能。
- 认知碎片持久化于 `[项目根目录]/.mcp/memory.json`。
- 工具集：`n2n_add_entities`, `n2n_add_observations`, `n2n_create_relations`, `n2n_read_graph`, `n2n_search`。
