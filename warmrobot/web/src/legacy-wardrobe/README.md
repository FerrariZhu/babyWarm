# Legacy wardrobe（隔离区）

衣橱录入、拍照识别、商品链接解析、美图等能力已从主链路移除，源码保留于此便于回退。

## 默认状态

- **不注册** Next.js 路由：本目录不在 `src/app/` 下，不会被访问。
- **不参与** 主工程 TypeScript 检查（见 `web/tsconfig.json` 的 `exclude`）。
- 主产品路径（首页今日简报、宝宝档案、天气）**禁止** import 本目录。

## 临时挂回路由（回退）

1. 将 `app/wardrobe`、`app/add` 拷回 `src/app/`。
2. 将 `api/clothing` 拷回 `src/app/api/`。
3. 将组件放回 `src/components/stitch/`，hooks 放回 `src/hooks/`，lib 放回 `src/lib/`（或改 tsconfig paths / 取消 exclude 并统一 `@/legacy-wardrobe/*` 引用）。
4. 恢复底栏「衣柜」「添加」入口（`bottom-nav.tsx`）。
5. 从 `tsconfig.json` 的 `exclude` 去掉 `src/legacy-wardrobe`。
6. 确认 `.env.local` 含 VISION / BEAUTIFY / ONEBOUND 等变量（见 `web/.env.local.example` legacy 段）。

## 测试脚本

```bash
npm run test:wardrobe-vision -- path/to/photo.jpg
npm run test:garment-image -- path/to/photo.jpg
npm run import:catalog
```

脚本位于 `web/scripts/legacy/`。
