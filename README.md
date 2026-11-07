# Typetiger Studio

Typetiger Studio 是一个使用 Vinext/Next.js、Cloudflare D1、R2 与 ChatGPT 登录的作品集网站。公开首页只读取 `published` 案例；后台位于 `/admin`。

## 数据与存储

- D1（绑定名 `DB`）：案例、详情图元数据、分类和网站设置。
- R2（绑定名 `BUCKET`）：后台上传的 JPG、PNG、WebP 图片。
- `public/assets`：从第一版网站迁移的 6 张既有案例封面。
- 管理员身份：ChatGPT 登录 + 服务端 `ADMIN_EMAILS` 白名单。

正式内容不使用 localStorage、浏览器缓存或数据库 Base64 字段。

## 环境变量

复制 `.env.example` 为 `.env`，设置：

```env
ADMIN_EMAILS=owner@example.com
```

多个管理员使用英文逗号分隔。`.env` 已被 Git 忽略；线上值通过 Sites 环境变量管理。

## 本地运行

```bash
npm install
npm run db:generate
npm run build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_nasty_war_machine.sql
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0001_funny_slipstream.sql
npm run dev
```

本地访问 `/signin-with-chatgpt?return_to=/admin`，默认模拟账号为 `seedy@sites.test`。测试时需把它加入本地 `ADMIN_EMAILS`。

## 初始化管理员与案例

1. 在 Sites 环境变量中设置 `ADMIN_EMAILS`。
2. 部署后用该邮箱对应的 ChatGPT 账号登录。
3. 打开 `/admin`；首次使用时点击“迁移原有 6 个案例”。该操作可重复执行，不会复制数据。

Minibudi、Meet Pal、Magic Zoo、Capypets 默认是草稿；SpongeBob SquarePants 默认隐藏；Character Archetypes 默认公开。发布前应先确认授权和保密状态。

## 新建案例

后台登录 → “新建” → 填写名称、Slug、分类和内容 → 上传封面/详情图 → 保存草稿 → 预览 → 确认发布。首页排序可在案例列表中拖动调整。删除案例时会再次询问是否同时删除 R2 图片。

## 发布 Journal 文章

Journal 使用轻量级 Markdown 文件，不需要进入后台。新增文章时：

1. 在 `content/journal/` 新建一个 `.md` 文件。
2. 文件顶部填写 frontmatter：`title`、`slug`、`date`、`category`、`summary`、`cover`、`featured`、`draft` 和 `tags`。
3. `category` 从 `lib/journal-config.ts` 中维护的分类选择；当前为“设计判断、项目复盘、设计管理、观察与思考”。
4. 设置 `draft: true` 时，文章不会出现在首页、Journal 列表或公开详情页；确认发布时改为 `false`。
5. 设置 `featured: true` 可让文章优先出现在列表和首页最近记录中；其余文章按日期倒序排列。

最小示例：

```md
---
title: 一篇设计手记
slug: article-slug
date: 2026-10-31
category: 设计判断
summary: 用一两句话介绍文章内容。
cover:
featured: false
draft: true
tags: [设计判断, 产品设计]
---

正文从这里开始。

## 二级标题

### 三级标题
```

插入图片与图注：

```md
![图片替代文字](/journal/example/image.webp "图片说明文字")
```

图片文件建议放在 `public/journal/<文章-slug>/`。`cover` 可留空；如需封面，填写以 `/` 开头的公开路径。较长文章包含至少 3 个 H2/H3 标题时，会自动显示文章目录。

## Journal 内容管理后台

Journal 已支持通过现有 `/admin` 管理。管理员登录后打开“文章”标签即可：

1. 点击“新建”，填写标题、稳定 Slug、摘要、分类和标签。
2. 在 Markdown 正文中直接粘贴内容；编辑器支持编辑、分栏和预览模式，并提供常用格式按钮。
3. 图片会在浏览器端压缩后上传到 R2，界面显示上传进度并在光标位置插入图片语法；有封面时必须填写 Alt。
4. 未保存正文会临时保存在当前浏览器，重新打开文章时可选择恢复。
5. 先保存草稿，再点击“保存并预览”；发布按钮旁会明确显示尚未完成的检查项。
6. 预览确认后发布。公开列表、详情页和首页 Journal 模块会立即从 D1 读取最新内容，不需要重新构建。
7. 撤稿后公开详情立即返回 404，文章与历史版本仍保留在后台。

每次修改、发布、撤稿、归档或恢复前都会保存历史快照。历史版本可以先与当前正文比较，再决定是否恢复。删除默认进入回收站；只有在回收站输入完整文章标题后才可永久删除。永久删除不会自动删除 R2 图片，以免破坏旧版本或其他正文引用。

文章分类位于文章后台底部，可以新增、改名和排序；仍被文章使用的分类不能删除。“文章日期”只控制显示日期，不是定时发布功能。

Journal 数据使用：

- D1：`journal_articles`、`journal_categories`、`journal_versions`。
- R2：`uploads/journal/YYYY-MM-DD/<uuid>.<ext>`。
- 管理接口继续使用 ChatGPT 登录与 `ADMIN_EMAILS` 服务端白名单。
- Markdown 不执行原始 HTML；链接和图片地址仅接受站内路径、HTTPS，以及链接的 `mailto:` / `tel:`。

### 现有 Markdown 一次性迁移

先生成可审查的 SQL，不直接连接数据库：

```bash
npm run journal:migration:prepare -- --output /tmp/typetiger-journal-import.sql
```

脚本按 Slug 使用 `INSERT OR IGNORE`，可避免重复导入；遇到字段或分类错误时会停止并输出错误。原始 `content/journal/**/*.md` 始终保留，不会删除或改写。

本地演练时依次执行 `drizzle/0002_journal_cms.sql`、`drizzle/0003_journal_archive.sql` 与生成的 SQL。生产迁移必须在确认报告后，使用正式 Sites 发布流程应用 migration；不要手工对远程 D1 执行未经审查的 SQL。

迁移期间采用兼容读取：同 Slug 的 D1 文章覆盖 Markdown 备份；D1 中的草稿或撤稿状态也会阻止旧 Markdown 版本重新公开。未迁移的 Markdown 文章仍可正常显示。

## 从 Obsidian 同步 Journal

V1 使用 Mac 本地导出，不连接 Google Drive API，也不读取整个 Vault。建议在现有 `Typetiger` Vault 内新建 `Journal Publish`，只把准备发布的文章及其引用图片放入该目录。原有 `Design book`、`天人录` 和其他目录不需要移动或修改。

### 首次配置

复制本地配置模板：

```bash
cp journal-sync.config.example.json journal-sync.config.json
```

编辑 `journal-sync.config.json`，把 `sourceDir` 改为 Mac 上 `Journal Publish` 的真实绝对路径：

```json
{
  "sourceDir": "/你实际的绝对路径/Typetiger/Journal Publish"
}
```

该文件已加入 `.gitignore`，不会提交个人目录信息。脚本不会猜测 Google Drive 挂载位置。

### Obsidian 属性模板

```yaml
---
title: 文章标题
slug: stable-article-slug
date: 2026-10-31
updated: 2026-10-31
category: 设计判断
summary: 一两句话的文章摘要
cover: assets/cover.webp
tags: [产品设计, 设计判断]
featured: false
publish: true
---
```

规则：

- 只有 `Journal Publish` 内且 `publish: true` 的 Markdown 才会导出。
- `title`、`slug`、`date`、`category`、`summary` 和 `publish` 必须合法；错误文章不会覆盖上一次成功版本。
- `slug` 只能使用小写字母、数字和连字符，一经发布不应修改。
- 分类统一来自 `content/journal/categories.json`。
- 图片必须位于 `Journal Publish` 内部，可使用普通 Markdown 图片或 `![[图片.webp|替代文字]]`。
- Obsidian 内链 `[[文章标题|显示文字]]` 会转换为 Journal 链接；无法解析时会输出警告并保留可见文字。
- 支持 Callout、代码块、引用、有序/无序列表和 Markdown 表格。
- 非图片嵌入会报错并跳过该文章，避免重要正文被静默丢弃。

### 每次同步

先检查，不写入：

```bash
npm run journal:sync -- --dry-run
```

正式导出：

```bash
npm run journal:sync
```

同步并执行网站构建检查：

```bash
npm run journal:prepare
```

导出的文章位于 `content/journal/obsidian/`，引用图片位于 `public/journal/<slug>/assets/`。`.obsidian-sync-manifest.json` 用于避免重复导出、检测文件改名和保持稳定 URL。

### 撤稿与删除规则

- 把 `publish` 从 `true` 改为 `false`、删除源文件或把文件移出目录，都不会自动删除网站中上一次成功版本；同步报告会明确提示。
- 确认撤稿后执行：

```bash
npm run journal:sync -- --withdraw stable-article-slug
```

- 撤稿文章会移动到 `content/journal/withdrawn/`，不会进入公开构建，但仍保留在 Git 历史和仓库中；图片不会自动永久删除。
- 修改已发布 slug 会被拒绝。若确需更换 URL，应先撤稿旧 slug，再建立新文章，并单独评估重定向；V1 不会自动猜测重定向关系。

### GitHub 与部署现状

当前本地仓库没有配置 GitHub remote，也没有 GitHub Actions；ChatGPT Sites 不会因为普通 GitHub push 自动更新。首次接入 GitHub 时建议创建私有仓库，并使用 SSH 或 GitHub CLI 的系统凭据：

```bash
git remote add github git@github.com:YOUR_ACCOUNT/typetiger-studio.git
git push -u github main
```

不要把整个 Obsidian Vault、`journal-sync.config.json`、Token 或 Google Drive 路径提交到 GitHub。发布前只提交同步生成的 Journal 文件、相关图片、manifest 和必要代码。正式上线仍需使用现有 Sites 版本发布流程，并在发布前人工确认；本项目尚未配置 GitHub push 自动部署。

## 部署

项目由 ChatGPT Sites 托管，`.openai/hosting.json` 保留原项目 ID，并声明 D1/R2 绑定。部署流程会按顺序应用 `drizzle/*.sql`、构建 Worker、保存版本并发布。不要手动更换项目 ID、域名或访问范围。
