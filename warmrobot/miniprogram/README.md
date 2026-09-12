# 微信小程序真机联调

1. 在 `config.js` 填入部署后的 HTTPS API 域名，并在微信公众平台的“开发管理 → 开发设置 → 服务器域名”中添加该域名为 request 合法域名。
2. 在微信开发者工具导入本目录，把 `project.config.json` 的 `appid` 改为正式小程序 AppID。
3. 在 Web 服务的部署环境配置 `WECHAT_APP_ID`、`WECHAT_APP_SECRET` 与 `DATABASE_URL`，并应用 `postgres/migrations/20260910221000_wechat_self_hosted_auth.sql`。登录身份与会话只写入自托管 PostgreSQL，不依赖 Supabase。
4. 使用真机点击“微信手机号登录”。首次登录会建立账户；已在同手机号账户存在数据时会直接复用该账户。

不会把 AppSecret、数据库密码或 refresh token 写入小程序源码。刷新令牌只保存在设备本地，网络请求仅发送到已登记的 HTTPS 域名。
