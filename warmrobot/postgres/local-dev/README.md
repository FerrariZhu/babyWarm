# 一次性本地测试数据库

`bootstrap.sql` 用于独立、可丢弃的开发数据库，包含 Web/微信登录与原生宝宝档案闭环所需的基础表。它不替代生产数据库完整 schema，也不能应用到线上数据库。生产变更必须审查对应迁移、备份与数据库权限。

## 配置

- 使用独立测试数据库和最小权限账号；将连接串放在被 Git 忽略的 `web/.env.local`，绝不提交口令。
- 仓库现有 Windows 辅助脚本 `scripts/start-local-postgres.ps1` 依赖该电脑上的 PostgreSQL 安装与本地路径；不是跨平台自动安装器。在 dot 云环境中未安装或启动 PostgreSQL。
- 对准备好的一次性开发库，在 `warmrobot/` 运行：

```bash
npm run db:migrate -w web -- ../postgres/local-dev/bootstrap.sql
npm run dev
```

通过 Web 注册入口创建**独立的合成测试账号**，或使用具备项目权限的微信测试用户；不要复用公开共享 Demo 身份或输入真实儿童资料。

## 微信与建议测试

微信手机号登录仍需在服务端 `web/.env.local` 配置与小程序 AppID 一致的 `WECHAT_APP_ID`、`WECHAT_APP_SECRET`。新库的服装配置为空时，核心建议引擎使用内置类目；如需验证后台配置与完整图片/细款数据，应准备经过审查的测试种子及完整 schema，而非导入真实用户资料。

历史 `20260913120000_demo_account.sql` 保留作迁移历史，不再作为新测试流程的账号入口。C 端已移除共享 Demo 提示，并在服务端拒绝该身份与既有会话；`20261028010000_disable_shared_demo_account.sql` 是独立停用迁移，代码修改不代表它已在线上执行。

本次自动化测试使用模拟数据库/网络契约；未执行实际 PostgreSQL 引导、生产迁移或微信账号授权。
