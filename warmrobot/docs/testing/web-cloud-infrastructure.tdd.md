# C 端云服务器架构迁移：TDD 证据

## 用户目标

C 端的数据库、认证和图片存储均使用已部署的云服务器能力，生产运行时、依赖和环境配置不再需要第三方 BaaS SDK。

## RED

新增 `scripts/web-cloud-infrastructure.test.mjs` 后执行：

```bash
node --test scripts/web-cloud-infrastructure.test.mjs
```

5 项契约测试全部按预期失败，分别定位到运行时客户端、SDK 依赖与环境变量、页面会话导入、旧认证回调和旧架构文档。

## GREEN

- C 端页面统一使用 `src/lib/self-hosted/session.ts` 和自有 `app_sessions` 会话。
- 删除 C 端托管服务客户端、旧托管认证回调和不再使用的身份适配代码。
- 移除相关 npm SDK 及 lockfile 传递依赖。
- 环境模板改为 `WEB_DATABASE_URL`、微信服务端凭证和服务器图片目录。
- README 明确 PostgreSQL、应用自有认证、HttpOnly Cookie、服务器持久化目录和反向代理结构。

同一测试目标复跑为 5/5 PASS；项目全量测试为 89/89 PASS。

## 覆盖率与构建

- `node --experimental-test-coverage --test scripts/web-cloud-infrastructure.test.mjs`：被执行的 JavaScript line/branch/function 均为 100%。
- `npm run verify`：Web/Admin lint、core/Web/Admin typecheck 与两个 Next.js production build 全部通过。
- Web lint 保留 5 条迁移前已有警告，没有新增错误；Admin lint 无警告或错误。
