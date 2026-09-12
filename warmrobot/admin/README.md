# 暖宝宝 配置后台

本地运行的管理端，与 C 端 `web` 分离。后台登录、会话、配置 CRUD、用户查询、分析数据和图片资产均连接云服务器 PostgreSQL/持久化目录，不依赖第三方 BaaS SDK。

## 模块

| 路径 | 说明 |
|------|------|
| `/admin/categories` | 品类管理（穿搭槽位、保温区间、商品链接） |
| `/admin/users` | 用户信息（读写云端 PostgreSQL；可查看穿衣记录） |

旧路径 `/categories` 会自动跳转到 `/admin/categories`。

云服务器数据库需导入 `scripts/export-self-hosted-schema.mjs` 生成的结构及 `postgres/migrations/` 中的增量迁移。

## 启动

```bash
# 在 warmrobot/ 根目录
cp admin/.env.local.example admin/.env.local   # 至少填 DATABASE_URL + ADMIN_EMAILS
npm run dev:admin
```

浏览器打开 **http://localhost:3001/admin**

C 端仍在 **http://localhost:3000**（`npm run dev`）。

## 环境变量

`DATABASE_URL` 与 `ADMIN_EMAILS` 是后台登录必填项。生产环境还应按部署方式配置 `DATABASE_SSL`、`GUIDE_ASSET_DIR` 和 `NEXT_PUBLIC_WEB_APP_URL`；数据库口令绝不能放进浏览器环境或提交到 Git。
