# 配置后台公网端口修复 TDD 证据

## 用户旅程

作为云端管理员，我希望 `NEXT_PUBLIC_ADMIN_URL` 指向的 3001 端口能从公网访问，以便打开配置后台查看和维护已发布的品类图片。

## RED / GREEN

| 保证 | 测试 | 类型 | 结果 | 证据 |
| --- | --- | --- | --- | --- |
| Admin Compose 服务监听 `0.0.0.0`，不再仅监听回环地址 | `scripts/docker-self-hosted-deploy.test.mjs` | 配置集成测试 | PASS | 修改前失败并显示 `-H 127.0.0.1`；修改后 5/5 通过 |
| 全部应用测试保持通过 | `npm test` | 回归测试 | PASS | 79/79 通过 |
| Web 与 Admin 可完成生产构建 | `npm run verify` | 构建验证 | PASS | 两个 Next.js workspace 均构建成功 |

## 已知边界

公网能否访问 3001 端口还取决于云主机防火墙和云安全组；部署后需从外网再次请求验证。
