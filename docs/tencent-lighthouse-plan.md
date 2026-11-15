# 腾讯云轻量应用服务器迁移计划

目标架构：标准 Next.js Node 服务 + SQLite + 腾讯云 COS。现有视觉、公开 URL、项目与 Journal 数据模型保持不变。

## 运行边界

- Node.js 24 LTS（最低 22.13）。
- SQLite 默认位于 `.data/typetiger.sqlite`，不提交 Git。
- 图片保存到 COS；Secret 只存在服务器环境变量。
- Nginx 或 Caddy 负责 HTTPS 和反向代理，Node 服务只监听本机端口。
- 管理后台使用独立 Session 登录，不再依赖 ChatGPT Sites 请求头。

## 分阶段改造

1. SQLite 原型：复用现有 migration，验证 Seed、外键、WAL、完整性与重复执行。
2. Repository：把作品和 Journal 数据读取从 D1 改到 SQLite。
3. API：把管理接口中的 D1 PreparedStatement 改为 SQLite 事务。
4. COS：替换 R2 上传、读取和删除；公开 URL 使用 COS/CDN 地址。
5. 登录：管理员密码哈希、HttpOnly/Secure/SameSite Session、登录限速和 CSRF 校验。
6. 数据迁移：只读导出 D1/R2，在测试服务器恢复并逐项校验。
7. 部署：测试域名验证后，再切换正式域名；原站保留作为回滚点。

## COS 配置

本地未设置 COS 变量时，图片保存在 `LOCAL_UPLOAD_PATH`；服务器上同时设置以下四项后会自动切换到 COS：

```env
COS_SECRET_ID=
COS_SECRET_KEY=
COS_BUCKET=example-1250000000
COS_REGION=ap-shanghai
```

- `COS_BUCKET` 必须包含 APPID。
- 建议使用私有读写桶，公开图片继续通过站点 `/media/*` 路由输出。
- CAM 子用户只授予目标存储桶的对象读取、写入和删除权限，不使用主账号永久密钥。
- 配置完成后运行 `npm run cos:test`，该命令会写入、读回并删除一个临时测试文件。

## 备份建议

- SQLite 每日在线备份，至少保留 7 个日备份和 4 个周备份。
- 备份前执行 `PRAGMA quick_check`，备份后在临时文件中执行恢复验证。
- COS 开启版本控制或生命周期策略，防止后台误删图片。
- 应用代码继续由 GitHub 管理；数据库文件、密钥和上传文件不得进入 Git。
