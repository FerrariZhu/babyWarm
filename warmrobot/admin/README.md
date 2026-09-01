# 暖宝宝 配置后台

本地运行的管理端，与 C 端 `web` 分离；数据写入同一 Supabase 项目。

## 模块

| 路径 | 说明 |
|------|------|
| `/admin/categories` | 品类管理（穿搭槽位、保温区间、商品链接） |
| `/admin/users` | 用户信息（读 C 端真实数据 + 写入 Supabase 记录；可查看穿衣记录） |

旧路径 `/categories` 会自动跳转到 `/admin/categories`。

**用户信息**需先应用 migration `20240101000022_admin_user_info_records.sql`；穿衣记录需 `20240101000029_dressing_records.sql`（远程 Supabase 在 Dashboard → SQL 中执行，或本地 `supabase db reset`）。

## 启动

```bash
# 在 warmrobot/ 根目录
cp admin/.env.local.example admin/.env.local   # 填 ADMIN_EMAILS + SERVICE_ROLE
npm run dev:admin
```

浏览器打开 **http://localhost:3001/admin**

C 端仍在 **http://localhost:3000**（`npm run dev`）。

## 环境变量

见 `.env.local.example`。可与 `web/.env.local` 共用同一 Supabase URL/anon key；`SUPABASE_SERVICE_ROLE_KEY` 仅放本目录。
