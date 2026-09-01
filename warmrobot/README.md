# 暖宝宝

Web 端应用：根据天气与宝宝档案，给出今日穿搭**类型建议**（无需录入衣柜）。

## 前置条件

- Node.js 18+
- Supabase 项目（执行 `supabase/migrations/` 下全部 migration）

## 快速开始

```bash
# 在 warmrobot/ 目录
cp web/.env.local.example web/.env.local
cp admin/.env.local.example admin/.env.local
# 编辑 .env.local，填入 Supabase URL、anon key；admin 另需 ADMIN_EMAILS + service role key

npm install
npm run dev          # C 端 http://localhost:3000
npm run dev:admin    # 配置后台 http://localhost:3001/admin
```

## 项目结构

```
warmrobot/
├── packages/core/              # 保暖分 + 类目建议 + 天气
├── web/                        # Next.js C 端
├── admin/                      # 品类/细类型配置后台
│   └── src/
└── supabase/migrations/        # 数据库 schema + 品类种子数据
```

## 功能（MVP）

- [x] 邮箱 / 微信 Mock 登录（Supabase Auth）
- [x] 宝宝档案、当地天气（Open-Meteo）
- [x] 今日穿搭清单（室内 / 外出 / 睡眠）
- [x] 细类型说明半弹层、穿衣记录
- [x] 配置后台（品类、细类型、用户备注）

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 C 端 |
| `npm run dev:admin` | 启动配置后台 |
| `npm run dev:clean` | 清缓存并重启 C 端 |
| `npm run verify` | lint + typecheck + production build |
