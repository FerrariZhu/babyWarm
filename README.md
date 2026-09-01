# 暖宝宝 (babyWarmRobot)

根据当地天气与宝宝档案，给出今日穿搭类型建议（家里穿 + 出门再加 + 条件提醒）。

## 快速开始

```bash
cd warmrobot
cp web/.env.local.example web/.env.local   # 填入 Supabase URL / anon key
npm install
npm run dev                                 # C 端 http://localhost:3000
npm run dev:admin                           # 配置后台 http://localhost:3001/admin
```

部署 C 端见根目录 [`netlify.toml`](netlify.toml)（构建目录 `warmrobot/web`）。

## 仓库结构

```
warmrobot/
├── packages/core/    # 保暖分、类目建议、天气工具
├── web/              # Next.js C 端
├── admin/            # 品类配置后台
└── supabase/         # 数据库 migrations
```

详细说明见 [`warmrobot/README.md`](warmrobot/README.md)。
