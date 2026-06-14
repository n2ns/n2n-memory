# 如何正确配置 npm Trusted Publishing：用 GitHub Actions 安全发布 npm 包

> SEO 摘要：本文介绍如何使用 npm Trusted Publishing、GitHub Actions 和 OpenID Connect (OIDC) 自动发布 npm 包，替代长期 `NPM_TOKEN`。适用于遇到 `npm publish E404`、`Access token expired or revoked`、npm token 过期、GitHub Actions 发布 npm 包失败等问题的开源项目维护者。

## 快速结论

如果你想从 GitHub Actions 发布 npm 包，推荐使用 **npm Trusted Publishing**，而不是长期保存 `NPM_TOKEN`。正确配置需要同时满足四件事：

1. npm 包设置中添加 Trusted Publisher，并精确填写 GitHub organization/user、repository、workflow filename。
2. GitHub Actions workflow 使用 GitHub-hosted runner。
3. workflow 具备 `id-token: write` 权限。
4. 使用支持 OIDC 的新版本 Node/npm，例如 Node 24 + npm latest。

本文基于 `n2n-memory` 从 token 发布迁移到 Trusted Publishing 的真实排错过程。

## 适合搜索的问题

你可能是通过这些关键词找到本文的：

- npm Trusted Publishing 配置
- GitHub Actions 发布 npm 包
- npm OIDC publishing
- npm publish E404 Not Found PUT
- Access token expired or revoked npm
- npm token 过期怎么办
- npm provenance GitHub Actions
- scoped package npm publish 404
- npm publish
- 如何不用 NPM_TOKEN 发布 npm 包

## 为什么要用 Trusted Publishing

传统 GitHub Actions 发包通常会在仓库 Secret 里保存 `NPM_TOKEN`。这个方案能用，但长期看有几个问题：

- token 会过期或被吊销。
- token 需要人工轮换。
- token 泄露后风险较大。
- 开启 2FA 后，自动发布还要处理 bypass 2FA。

Trusted Publishing 的思路是：npm 信任某个 GitHub 仓库里的某个 workflow。当这个 workflow 运行 `npm publish` 时，GitHub Actions 通过 OIDC 生成短期身份凭证，npm 验证通过后允许发布。

这样不需要长期 npm token，也会自动生成 provenance 供应链证明。

## npm 页面怎么配置

打开包页面：

```text
https://www.npmjs.com/package/<package-name>/access
```

例如：

```text
https://www.npmjs.com/package/n2n-memory/access
```

进入 `Settings` 后找到 **Trusted Publisher**，选择 **GitHub Actions**。

推荐填写：

```text
Publisher: GitHub Actions
Organization or user: n2ns
Repository: n2n-memory
Workflow filename: publish.yml
Environment name: 留空
Allowed actions: Allow npm publish
```

注意：

- `Workflow filename` 只填文件名，例如 `publish.yml`。
- 不要填 `.github/workflows/publish.yml`。
- organization、repository、workflow filename 都必须和 GitHub 上完全一致。
- 如果你没有使用 GitHub Environment，`Environment name` 留空。
- 填完一定要点 **Save changes**。

## GitHub Actions workflow 推荐配置

下面是一个可工作的 `publish.yml` 示例：

```yaml
name: Publish Package

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:

permissions:
  id-token: write
  contents: read

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6

      - uses: actions/setup-node@v6
        with:
          node-version: '24'
          registry-url: 'https://registry.npmjs.org'
          package-manager-cache: false

      - name: Upgrade npm for Trusted Publishing
        run: npm install -g npm@latest

      - run: npm ci

      - run: npm run check

      - run: npm publish
```

关键点解释：

- `id-token: write` 是 OIDC 必需权限。
- `runs-on: ubuntu-latest` 使用 GitHub-hosted runner。
- `node-version: '24'` 避免旧 npm CLI 不支持最新 OIDC 发布流程。
- `npm install -g npm@latest` 确保 npm CLI 满足 Trusted Publishing 要求。
- `registry-url` 必须是 `https://registry.npmjs.org`。
- 当前 `n2n-memory` 是 unscoped public package，直接 `npm publish`。scoped public package 才需要 `npm publish --access public`。
- 不要给 `npm publish` 设置 `NODE_AUTH_TOKEN`。

## package.json 需要注意什么

建议至少包含：

```json
{
  "name": "n2n-memory",
  "version": "1.2.2",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/n2ns/n2n-memory.git"
  },
  "bin": {
    "n2n-memory": "build/index.js"
  }
}
```

重点：

- `repository.url` 要指向真实 GitHub 仓库。
- unscoped package 不需要 `publishConfig.access = public`。
- 首次本地发布短包名时不要强制 `publishConfig.provenance = true`，否则没有 OIDC 环境可能阻塞发布。
- npm provenance 会校验仓库来源，仓库信息不匹配可能导致发布失败。

## 正确发布流程

1. 在 npm 包设置里保存 Trusted Publisher。
2. 修改并推送 `.github/workflows/publish.yml`。
3. 确认 `package.json` 版本号未发布过。
4. 打 tag：

```bash
git tag v1.2.2
git push origin v1.2.2
```

5. 等 GitHub Actions 的 `Publish Package` 完成。
6. 检查 npm：

```bash
npm view n2n-memory dist-tags.latest
npm view n2n-memory versions --json
```

如果成功，`latest` 会变成新版本。

## 常见错误与修复

### 1. `npm publish` 报 E404 Not Found

典型日志：

```text
npm error code E404
npm error 404 Not Found - PUT https://registry.npmjs.org/@scope%2fpackage - Not found
npm error 404 '@scope/package@x.y.z' is not in this registry.
```

这通常不是“包真的不存在”，而是认证或信任关系没有匹配。优先检查：

- npm Trusted Publisher 是否保存成功。
- `Organization or user` 是否等于 GitHub owner。
- `Repository` 是否等于 GitHub repo name。
- `Workflow filename` 是否只填 `publish.yml`。
- workflow 是否位于 `.github/workflows/publish.yml`。
- 是否使用 GitHub-hosted runner。
- 是否有 `permissions.id-token: write`。
- 是否使用 Node 24 或 npm 11.5.1+。

### 2. `Access token expired or revoked`

如果你已经切换到 Trusted Publishing，却仍看到 token 过期提示，通常是 npm CLI 走错认证路径。

检查：

- `npm publish` 步骤不要设置 `NODE_AUTH_TOKEN`。
- 不要把 `NODE_AUTH_TOKEN` 设置为空字符串。
- 不要在发布 job 里写入带 token 的 `.npmrc`。
- 升级到 Node 24 和 npm latest。

### 3. `npm whoami` 不能验证 OIDC

Trusted Publishing 的 OIDC 认证发生在 `npm publish` 时。`npm whoami` 仍然依赖传统认证，不能用来证明 OIDC 是否配置成功。

验证方式应该是直接跑发布 workflow，然后看 `npm publish` 是否成功。

### 4. workflow_dispatch 手动发布不生效

如果使用 `workflow_dispatch` 或 `workflow_call`，npm 可能校验调用方 workflow。简单项目推荐让同一个 `publish.yml` 直接执行 `npm publish`，避免嵌套 workflow 导致匹配失败。

### 5. npm 包已经转移 owner 后仍失败

包 owner 转移只解决 npm 包权限归属，不等于 Trusted Publisher 自动配置完成。转移后仍要在包设置中重新确认：

- 当前 npm 账号对包有写权限。
- Trusted Publisher 指向正确 GitHub 仓库。
- 发布 workflow filename 与 npm 设置完全一致。

## 最小检查清单

发布前确认：

- npm 包已有 Trusted Publisher。
- `Workflow filename` 等于 `publish.yml`。
- workflow 文件实际路径是 `.github/workflows/publish.yml`。
- workflow 使用 `id-token: write`。
- workflow 使用 `node-version: '24'`。
- `npm publish` 没有 `NODE_AUTH_TOKEN`。
- `package.json` 的 `repository.url` 指向当前 GitHub 仓库。
- `package.json` 的版本号尚未发布。

## 参考链接

- npm Trusted Publishing 官方文档: https://docs.npmjs.com/trusted-publishers/
- npm access tokens 官方文档: https://docs.npmjs.com/about-access-tokens/
- npm scoped public packages: https://docs.npmjs.com/creating-and-publishing-scoped-public-packages/
- GitHub Actions OIDC 文档: https://docs.github.com/en/actions/security-for-github-actions/security-hardening-your-deployments/about-security-hardening-with-openid-connect
