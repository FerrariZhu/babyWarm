# 微信小程序调试

## 开发者工具本地调试（域名备案期间）

1. 在微信开发者工具导入 `D:\暖宝宝\warmrobot`。该目录的 `project.config.json` 已指向 `miniprogram/`，并使用正式小程序 AppID。
2. 在 `warmrobot/` 安装依赖（`npm install`），将 `web/.env.local.example` 复制为 `web/.env.local`，填入可用的 `WEB_DATABASE_URL`、`WECHAT_APP_ID` 和 `WECHAT_APP_SECRET`。微信凭证要与开发者工具项目的 AppID 一致；它们只保存在服务端的 `.env.local` 中。
3. 在 `warmrobot/` 运行 `npm run dev`，保持终端打开，确认 `http://127.0.0.1:3000` 可以访问。
4. 在开发者工具的「详情 → 本地设置」勾选「不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书」，再点击「编译」。模拟器会自动请求本机 `http://127.0.0.1:3000`；调试器的 Network 面板可查看 `/api/auth/wechat/login` 的状态码和响应。

这仅用于电脑上的开发者工具模拟器。手机号登录仍会由本地服务端向微信换取凭证，并写入 PostgreSQL；没有可用数据库或匹配的微信凭证时，页面和布局仍可调试，但登录不会成功。手机预览不会连接电脑的 `127.0.0.1`，需要另行准备手机可访问的测试 API 地址；正式发布前仍需完成域名及合法域名配置。

## 真机联调与发布

1. 确认 `config.js` 中的线上 HTTPS API 域名可访问，并在微信公众平台的“开发管理 → 开发设置 → 服务器域名”中添加该域名为 request 合法域名。
2. 在微信开发者工具导入本目录，把 `project.config.json` 的 `appid` 改为正式小程序 AppID。
3. 在 Web 服务的部署环境配置 `WECHAT_APP_ID`、`WECHAT_APP_SECRET` 与 `DATABASE_URL`，并应用 `postgres/migrations/20260910221000_wechat_self_hosted_auth.sql`。登录身份与会话只写入云服务器 PostgreSQL。
4. 使用真机点击“微信手机号登录”。首次登录会建立账户；已在同手机号账户存在数据时会直接复用该账户。

## 天气与定位

- 登录后首页调用 `wx.getLocation` 获取 WGS84 坐标，设备端直接请求 BigDataCloud 的免费客户端逆地理接口，随后通过自己的 HTTPS API 域名请求 `/api/profile/location`；服务端按坐标查询天气，地名反查失败不会挡住天气。还需要在微信公众平台把 `https://api-bdc.net` 加入 request 合法域名。
- 用户可以用微信原生 `wx.chooseLocation` 手动选择地点；手动选择会保留，后续刷新更新该地点天气，点击“使用当前位置”才切回设备定位。最近一次天气缓存在设备上，30 分钟内再次打开直接显示。
- 在微信公众平台完成 `getLocation`、`chooseLocation` 对应的隐私保护指引和定位权限说明，并披露定位坐标会由设备发送给 BigDataCloud 用于地名查询。用真机分别验证首次授权、拒绝、设置页重新授权、手动选点和下拉刷新。`app.json` 已声明所需隐私接口及权限用途。
- 正式商用前为 Open-Meteo 配置商用 API Key。自动定位的地名由当前设备直接向 BigDataCloud 查询；若查询失败，可在服务端设置自建 Nominatim 的 `NOMINATIM_REVERSE_URL` 作为补充。两者都不可用时，页面提示“选择具体地点”，天气仍按坐标返回。不要将 OpenStreetMap 公共 Nominatim 端点直接作为生产服务。

不会把 AppSecret、数据库密码或 refresh token 写入小程序源码。刷新令牌只保存在设备本地；真机请求发送到已登记的 HTTPS 域名，开发者工具模拟器可请求本地调试服务。
