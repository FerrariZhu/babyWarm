# 登录页 Demo 账号 — TDD 证据

## 来源与用户旅程

本次用户旅程直接来自需求：

- 作为查看产品演示的访客，我希望在登录表单下方看到可用的 Demo 账号与密码，以便无需额外询问即可进入应用体验。
- 作为使用公开 Demo 凭据的访客，我希望账号随自托管 PostgreSQL 部署初始化，以便页面展示的凭据确实可以登录。
- 作为遇到登录故障的访客，我希望区分凭据错误、请求过多和服务异常，以便采取正确的下一步操作。

## 执行记录

- RED：运行 `node --test scripts/login-demo-account.test.mjs`，新增用例因登录页尚无 `aria-label="Demo 账号"` 而失败。
- GREEN：加入 Demo 账号区块后再次运行同一命令，1 个用例通过。
- 登录修复 RED：运行 `node --test scripts/demo-account-login.test.mjs`，2 个用例分别因缺少 Demo 账号迁移和登录响应分流模块而失败。
- 登录修复 GREEN：加入 PostgreSQL 增量迁移和状态码分流后再次运行同一命令，2 个用例全部通过；测试同时用应用相同的 scrypt 算法验证公开 Demo 密码与迁移摘要匹配。
- 回归：运行 `npm test`，92 个用例全部通过。
- 项目校验：清理 Next.js 缓存后运行 `npm run verify`，Web/Admin lint、类型检查和生产构建均通过；Web lint 保留 5 条与本改动无关的既有警告。
- 视觉验证：在 390×844 手机视口与默认桌面视口检查 `/login`，账号信息完整可见，长邮箱未溢出。

## 测试规格

| # | 保证内容 | 测试 | 类型 | 结果 |
|---|---|---|---|---|
| 1 | 登录页提供带无障碍名称的 Demo 账号区域 | `scripts/login-demo-account.test.mjs` | UI 合约 | PASS |
| 2 | 区域展示 `demo_user_1@warmrobot.dev` 和 `password123` | `scripts/login-demo-account.test.mjs` | UI 合约 | PASS |
| 3 | Demo 账号位于登录表单下方 | `scripts/login-demo-account.test.mjs` | UI 合约 | PASS |
| 4 | 自托管 PostgreSQL 迁移创建并启用页面公开的 Demo 账号 | `scripts/demo-account-login.test.mjs` | 数据库迁移合约 | PASS |
| 5 | 迁移中的 scrypt 摘要可校验公开 Demo 密码 | `scripts/demo-account-login.test.mjs` | 安全单元测试 | PASS |
| 6 | 登录页分别处理 401、429 和 503，且不展示服务端敏感错误 | `scripts/demo-account-login.test.mjs` | UI 逻辑单元测试 | PASS |

## 覆盖率与已知缺口

项目未配置覆盖率脚本，因此没有生成百分比报告。新增登录行为的 2 个测试覆盖了全部新增分支与迁移约束；全量现有测试同时通过。当前环境没有生产数据库连接串，因此未在真实 PostgreSQL 实例上执行迁移；上线时仍需应用该增量迁移。

## 合并证据

- RED 检查点：`4bbd893 test: add login demo account requirement`
- GREEN 检查点：`5a686b0 feat: show demo credentials on login`
- 登录修复 RED 检查点：`262ec65 test: reproduce demo account login failure`
- 登录修复 GREEN 检查点：`1b8f622 fix: provision demo account login`

## 2026-09-14 Netlify 展示回归修复

### 故障与根因

- 用户截图显示 Netlify `/login` 页面只保留已预填的邮箱和密码输入框，登录按钮后直接进入微信提示，没有可见的测试账号说明。
- 检查线上 HTML 与服务器当前 release 源码后确认，两者都缺少本地源码已有的测试账号区块。近期增量发布沿用了服务器上的旧 release 基线，而登录页未出现在增量文件中，因此旧页面被继续发布。
- 本次对登录页做显式变更，使该文件进入下一次增量发布，同时把测试账号区块改为更清晰的“测试账号”，并提供“填入测试账号”按钮。

### RED / GREEN 证据

- RED：先扩展 `scripts/login-demo-account.test.mjs`，要求页面含 `aria-label="测试账号"`、可见账号密码和填入按钮；运行 `node --test scripts/login-demo-account.test.mjs`，因旧实现缺少新无障碍名称而失败。
- GREEN：实现测试账号说明与一键填入交互后再次运行同一命令，1 个用例通过。
- 类型检查：`npx tsc --noEmit -p web/tsconfig.json` 通过。
- 回归：`npm test`，103 个用例全部通过。
- 项目校验：按仓库要求清理 Web/Admin `.next` 缓存后运行 `npm run verify`，前后台 lint、类型检查与生产构建均通过；Web lint 仅保留 5 条与本改动无关的既有警告。
- 视觉验证：在本地真实 `/login` 页面检查桌面布局，标题、用途说明、填入按钮、邮箱和明文测试密码均完整显示；点击按钮可填入公开测试凭据。

### 新增保证

| # | 保证内容 | 测试 | 类型 | 结果 |
|---|---|---|---|---|
| 7 | 登录页显示清晰命名的“测试账号”区块 | `scripts/login-demo-account.test.mjs` | UI 合约 | PASS |
| 8 | 区块明确显示测试邮箱与密码 | `scripts/login-demo-account.test.mjs` | UI 合约 | PASS |
| 9 | 用户可点击按钮填入两项测试凭据 | `scripts/login-demo-account.test.mjs` | UI 行为合约 | PASS |
| 10 | 测试账号区块位于登录表单之后 | `scripts/login-demo-account.test.mjs` | 页面结构合约 | PASS |

本项目仍未配置 JSX 运行时覆盖率，因此没有可报告的百分比；本次使用源码行为合约、TypeScript 检查、全量测试和真实浏览器视觉检查共同覆盖回归风险。

### 修复检查点

- RED：`15f30b0 test: reproduce missing login test account panel`
- GREEN：`68d1fbc fix: restore visible login test account details`
