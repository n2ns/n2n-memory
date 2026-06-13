# n2n-memory 开发指南

[English](./DEVELOPMENT.md)

---

本手册记录了 N2N Memory MCP Server 的日常开发、测试及构建流程。

## 开发环境
- **Runtime**: Node.js v20+ (推荐 LTS 版本)
- **Language**: TypeScript
- **Package Manager**: npm

## 常用指令

### 1. 安装依赖
```bash
npm install
```

### 2. 运行测试
本项目使用 Vitest 和全局测试 API 执行单元测试。
```bash
npm test
```

### 3. 开发模式 (热更新)
```bash
npm run dev
```

### 4. 生产构建
将 TypeScript 编译为原生 JavaScript（输出到 `build/` 目录）。
```bash
npm run build
```

### 5. 启动服务
```bash
npm start
```

### 6. 完整本地检查
```bash
npm run check
```

该命令会依次执行 lint、测试、TypeScript 构建、依赖审计和 `npm pack --dry-run`。

## 核心架构说明

### 逻辑分层
1. **`index.ts`**: 服务启动层。创建 MCP Server，注册 handlers，连接 stdio transport，并在关闭时释放锁。
2. **`handlers/mcp-handlers.ts`**: MCP 边界层。解析 Zod Schema，执行项目根目录握手，格式化工具响应，并暴露资源。
3. **`core/memory-service.ts`**: 业务服务层。负责编排图谱/上下文操作、进程内互斥锁、跨进程文件锁、缓存刷新、搜索、合并、删除和关系完整性校验。
4. **`core/memory-manager.ts`**: 存储仓储层。负责 JSON 读写、Schema 校验、图谱规范化、原子写入、Markdown 导出和项目根目录输出边界。
5. **`tools/schemas.ts`**: 每个 MCP 工具的输入 Schema。
6. **`types.ts`**: 持久化数据 Schema 与 TypeScript 类型。

### 存储契约
- `memory.json` 存储长效图谱数据：实体、观测事实和关系。
- `context.json` 存储热任务状态：当前任务、状态、原因、下一步、最近提交，以及服务自动维护的 `updatedAt`。
- 存储文件不存在时视为空图谱或默认上下文。
- 已存在但无法读取的存储文件会抛错，避免损坏数据被空图谱覆盖。
- 导出路径必须是相对项目根目录的路径，且不能逃逸项目根目录。
- 项目根目录识别要求存在 `.git`、`.mcp`、`package.json`、`tsconfig.json` 或语言构建文件等强标记。只有 README 的目录会被拒绝。
- 日志默认隐藏完整本地路径。设置 `N2N_LOG_LEVEL=debug` 可输出完整路径用于诊断。

### 关键算法：Git 友好排序
每当写入图谱时，`MemoryManager` 会先规范化图谱副本：
- 实体按名称排序。
- 每个实体内的观测事实排序。
- 关系按 `from`、`to`、`relationType` 依次排序。
- JSON 统一使用 2 空格缩进。

这样做的目的是保证即使 AI 乱序生成了记忆片段，存入 Git 的文件 diff 依然稳定且可读。

### 并发与缓存行为
- `MemoryService` 为每个项目的图谱写入维护一个进程内 `Mutex`，并为上下文写入维护独立 `Mutex`。
- `proper-lockfile` 负责跨进程写入保护。
- 图谱与上下文会按项目路径缓存 snapshot，但普通读取会检查文件 mtime，因此能够感知外部编辑、Git pull 或其他 MCP 进程的修改。
- 写入 JSON 时先写临时文件，再执行原子移动。

### 图谱完整性
- 实体名称是项目图谱内的稳定标识。
- `n2n_create_relations` 会拒绝 `from` 或 `to` 端点不存在的关系。
- 删除实体时也会删除所有关联关系。

### CI 与发布
- Pull Request 和推送到 `main` 会通过 `.github/workflows/ci.yml` 在 Node.js 20 与 22 上运行检查。
- 推送 tag 会触发 `.github/workflows/publish.yml`，发布前会执行 `npm run check`。
- `package.json` 使用 `files` 白名单，npm 包只包含 `build/`、`docs/`、`README.md`、`CHANGELOG.md` 和 `LICENSE`。

## 贡献指南
- 所有的逻辑变更必须附带相应的单元测试。
- 修改存储结构前，请先更新 `docs/DESIGN.md`。
- 修改工具 Schema 或行为时，请同步更新 `docs/API_REFERENCE.md` 与 `docs/API_REFERENCE_zh.md`。
- 发布或提交 PR 前请运行 `npm run check`。
