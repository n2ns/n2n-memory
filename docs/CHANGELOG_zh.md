# 变更日志 (Changelog)

[English](../CHANGELOG.md)

---

本项目的所有重大变更都将记录在此文件中。

## [1.1.0] - 2024-12-19

### 新增 (Added)
- 双语 README 支持：分为 `README.md`（英文）和 `docs/README_zh.md`（中文）。
- 初始化 `CHANGELOG.md` 以追踪项目演进和技术发现。
- **全文档双语化**：包括 API 参考、设计方案和开发指南，均已实现中英双语关联。
- **基础设施强化**：
  - 在 `package.json` 中增加了 `engines` 字段，明确要求 Node.js >= 24 和 npm >= 11.5.1。
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
- **NPM 发布兼容性**：识别并记录了 Trusted Publishing (OIDC) 的关键要求。
  - **发现**：NPM CLI 10.x 版本（Node.js 22 附带）在尝试基于 OIDC 发布时，即使配置正确也会返回 `404 Not Found` 错误。
  - **要求**：必须使用 **NPM CLI 11.5.1+** 或 Node.js 24。
  - **规避方案**：在 CI/CD 工作流中增加 `npm install -g npm@latest` 步骤。

## [1.0.0] - 2024-12-19 之前

### 新增 (Added)
- 项目本地记忆隔离的核心 MCP 功能。
- 认知碎片持久化于 `[项目根目录]/.mcp/memory.json`。
- 工具集：`n2n_add_entities`, `n2n_add_observations`, `n2n_create_relations`, `n2n_read_graph`, `n2n_search`。
