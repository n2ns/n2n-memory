# n2n-memory 开发指南

[English](./DEVELOPMENT.md)

---

本手册记录了 N2N Memory MCP Server 的日常开发、测试及构建流程。

## 开发环境
- **Runtime**: Node.js v24.x+ (推荐以支持 Trusted Publishing)
- **Language**: TypeScript
- **Package Manager**: npm

## 常用指令

### 1. 安装依赖
```bash
npm install
```

### 2. 运行测试
本项目使用 `mocha` + `ts-node` (或 `tsx`) 执行单元测试。
```bash
npm test
```
> **注意**: 在 Windows 环境下，测试脚本已配置为正确处理 ESM 路径兼容性。

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

## 核心架构说明

### 逻辑分层
1. **`index.ts`**: MCP 协议层。负责处理 JSON-RPC、Resources 接口，并使用 **Zod** 进行输入校验。
2. **`memory-manager.ts`**: 业务逻辑层。负责文件 I/O、数据排序、实体合并等核心算法。
3. **`types.ts`**: 类型与 Schema 定义。包含 Zod 校验规则，是整个项目的类型基准。

### 关键算法：Git 友好排序
每当执行写操作（Update/Create）时，`MemoryManager.save` 会被触发：
- 它会递归地对数组进行排序。
- 这样做的目的是保证即使 AI 乱序生成了记忆片段，存入 Git 的文件 diff 依然是稳定且可读的。

## 贡献指南
- 所有的逻辑变更必须附带相应的单元测试。
- 修改存储结构前，请先更新 `docs/DESIGN.md`。
