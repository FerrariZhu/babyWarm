# 暖宝宝

Web 端应用：根据天气与宝宝档案，给出今日穿搭**类型建议**（无需录入衣柜）。

## 前置条件

- Node.js 22+
- 云服务器 PostgreSQL 数据库
- 用于持久化引导图片的服务器目录或 Docker volume

## 快速开始

```bash
# 在 warmrobot/ 目录
cp web/.env.local.example web/.env.local
cp admin/.env.local.example admin/.env.local
# 编辑 .env.local，填写 PostgreSQL 连接串；后台另需管理员邮箱

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
├── postgres/migrations/        # 自托管 PostgreSQL 增量迁移
└── assets/guide-image-seeds/   # 服务器图片存储的初始化资源
```

## 功能（MVP）

- [x] 邮箱 / 微信小程序登录（应用自有账号、会话与 HttpOnly Cookie）
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

## 生产架构

- 数据库：云服务器上的 PostgreSQL，应用通过参数化 SQL 和最小权限账号访问。
- 认证：`app_accounts` 与 `app_sessions` 保存账号和会话，登录凭证仅在服务端处理。
- 存储：引导图片写入服务器持久化目录，由受控 API 读取；Docker 部署使用具名 volume。
- 部署：Web 与 Admin 均为 Next.js 容器，由 Nginx/Caddy 反向代理并终结 HTTPS。

部署说明见 [`docs/deployment/docker-postgresql.md`](docs/deployment/docker-postgresql.md)。
