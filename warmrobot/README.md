# 暖宝宝

Web 与微信小程序：根据天气与宝宝档案，给出今日穿搭**类型建议**（无需录入衣柜）。

微信小程序已包含登录、宝宝档案、天气与穿衣建议的原生页面；联调与发布前检查见 [`miniprogram/README.md`](miniprogram/README.md)。

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

## 安全依赖基线

Next.js 保持 15.x，最低使用 `15.5.28`；图片处理使用 `sharp >=0.35.5`，匹配项目 Node.js 22+ 环境。该组合修复上游已披露的图片优化漏洞，见 [Next.js 官方公告](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) 与 [sharp 官方公告](https://github.com/lovell/sharp/security/advisories/GHSA-wq5f-xc86-pv6w)。

Next.js 15 的依赖声明仍固定旧版 PostCSS，根 `package.json` 使用同主版本 override 将其约束到 `>=8.5.23`，并显式声明共享 Next 开发工具依赖，避免 npm 在仅有 workspace 间接依赖时遗漏 override；不要在后续更新锁文件时移除此约束，除非上游已包含修复并重新通过审计。保持 `package-lock.json`，安装用 `npm ci`。发布候选至少重跑：

```bash
npm test
npm run verify
npm audit --omit=dev --audit-level=high
```

审计只反映当时已知依赖公告，不替代权限、隐私和真实环境验收。
