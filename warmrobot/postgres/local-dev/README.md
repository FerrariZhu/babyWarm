# 本地测试数据库

本目录的 `bootstrap.sql` 只包含 Web 测试账号登录与空白首页所需的最小表结构。它不替代生产数据库的完整 schema，也不应应用到线上数据库。

本机 PostgreSQL 18 的独立开发实例使用 `127.0.0.1:5433` 和 `warmrobot_dev`。数据保存在仓库内被 Git 忽略的 `.local-postgres/`，随机数据库密码保存在被 Git 忽略的 `web/.env.local`。

重启电脑后，在 `warmrobot/` 运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-local-postgres.ps1
npm run dev
```

首次引导已执行 `bootstrap.sql` 和 `20260913120000_demo_account.sql`。如重建全新开发数据库，可在 `warmrobot/` 运行：

```powershell
npm run db:migrate -w web -- ../postgres/local-dev/bootstrap.sql
npm run db:migrate -w web -- 20260913120000_demo_account.sql
```

测试账号为 `demo_user_1@warmrobot.dev` / `password123`。微信手机号登录仍需在 `web/.env.local` 中配置与小程序 AppID 一致的 `WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`。
