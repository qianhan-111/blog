# 上线前检查清单

本清单用于 `Preview` 和 `Production` 发布前的最后收口，目标是把本地门禁、平台配置、人工验收和观测检查统一到一份可执行步骤里。

## 1. 提交前本地校验

在项目根目录执行：

```bash
npm run verify
```

通过标准：

- 本机 `node -v` 输出 `v24.x.x`
- `lint` 通过
- `test:unit` 通过
- `test:backend` 通过
- `test:smoke` 通过
- `build` 通过

如果任一步失败，不要继续发布，先修复后重新执行完整 `verify`。

## 1.1 交接压缩包检查

如果不是通过 GitHub 仓库交接，而是直接发压缩包，在项目根目录执行：

```powershell
npm run package:handoff
```

成功后会生成：

```text
output/blog-handoff.zip
```

这个压缩包只包含 Git 中未被忽略的源码、配置和正式文档。它会排除 `.git/`、`node_modules/`、`dist/`、`coverage/`、`.vercel/`、`.playwright-cli/`、`output/`、`.trae/`、`.env`、`.env.local`、`.env.*.local`、`docs/plans/` 和 `docs/superpowers/`。

不要手动全选整个工作目录压缩。手动压缩容易把 Vercel 本地缓存、测试覆盖率、依赖目录、过程文档或真实环境变量一起发给接手人。

压缩包内会保留完整正式文档，也会保留给同学单独转发的中文短版文档：

- `docs/给同学的交接文档/01-文件接收入手教程.md`
- `docs/给同学的交接文档/02-后续部署配置教程.md`
- `docs/backend-api-contract.md`
- `docs/release-preflight-checklist.md`
- `docs/zero-basic-vercel-deployment-tutorial.md`

## 2. 环境变量确认

发布前确认平台环境变量已经配置真实值，而不是仓库占位值。

账号登录、邮箱验证和浏览器授权需要由账号所有者本人完成。课程作业排查时，优先发送构建日志、公开 URL、接口返回内容和截图；涉及 `DATABASE_URL`、`JWT_SECRET` 时先打码。确实临时暴露真实值给别人排查后，要在 Neon 或 Vercel 重新生成并替换对应密钥；不要把这些真实值提交到 GitHub、写进 README、公开文档或压缩包。

最低要求。下面是平台里应填写的形态，不要把仓库里的占位值原样复制到 Vercel：

```dotenv
DATABASE_URL=<目标环境的 Neon 或 PostgreSQL 连接字符串>
JWT_SECRET=<至少 32 位随机字符串>
JWT_EXPIRES_IN_SECONDS=86400
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Blog Platform
VITE_SITE_URL=<Production 正式 https 域名；Preview 或首次 Production 可在系统环境变量已暴露时省略>
VITE_INDEXING_ENABLED=false
VITE_OBSERVABILITY_ENABLED=false
VITE_OBSERVABILITY_DSN=<只有启用观测时才需要填写；课程作业可不添加>
# VITE_RELEASE_VERSION 可省略；省略时必须能读取 VERCEL_GIT_COMMIT_SHA
```

检查要点：

- `DATABASE_URL` 指向当前目标环境对应的 PostgreSQL/Neon 数据库
- `JWT_SECRET` 已替换为至少 32 位的随机字符串，不使用示例值
- `JWT_EXPIRES_IN_SECONDS` 已设置，推荐 `86400`
- `VITE_API_BASE_URL=/api`，让前端访问同一个 Vercel 项目里的 API functions
- `VITE_APP_TITLE` 已设置为目标站点标题
- `VITE_SITE_URL` 在 Production 指向正式前端域名；如果暂未手动配置，Vercel 系统环境变量必须能提供 `VERCEL_PROJECT_PRODUCTION_URL` 或 `VERCEL_URL`
- `VITE_INDEXING_ENABLED` 在 Preview 为 `false`，Production 按发布目标设置
- `VITE_RELEASE_VERSION` 已注入提交哈希、构建号或版本号，或 Vercel 系统环境变量已提供 `VERCEL_GIT_COMMIT_SHA`；线上不要使用 `local`、`dev`、`test` 或 `production`
- Preview 环境不要沿用 Production 的观测配置
- Production 环境如果启用观测，`VITE_OBSERVABILITY_ENABLED` 和 `VITE_OBSERVABILITY_DSN` 必须同时正确配置

## 2.1 Vercel 环境确认

课程作业简化说明：

- 可以只做一次 Production 部署，不强制单独创建 Preview。
- 可以让 Preview 和 Production 临时使用同一个 Neon 数据库，省去维护两套数据的成本。
- 可以把 `VITE_INDEXING_ENABLED` 保持为 `false`，只把 Vercel 网址交给老师访问，不需要搜索引擎收录。
- `JWT_SECRET` 只要是至少 32 位随机字符串即可，不需要为课程作业做复杂密钥轮换。

下面的 Preview/Production 分环境要求，更适合正式上线项目。课程作业按上面的简化说明执行也可以。

Vercel 环境变量模板：

```dotenv
DATABASE_URL=<Neon or PostgreSQL connection string>
JWT_SECRET=<at least 32 characters, random>
JWT_EXPIRES_IN_SECONDS=86400
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Blog Platform
VITE_SITE_URL=<Production 正式 https 域名；Preview 或首次 Production 可在系统环境变量已暴露时省略>
VITE_INDEXING_ENABLED=false
VITE_OBSERVABILITY_ENABLED=false
VITE_OBSERVABILITY_DSN=<只有启用观测时才需要填写；课程作业可不添加>
# VITE_RELEASE_VERSION 可省略；省略时必须能读取 VERCEL_GIT_COMMIT_SHA
```

课程作业按上面模板使用 `VITE_INDEXING_ENABLED=false` 即可。正式公开网站如果需要被搜索引擎收录，再只在 Production 改成 `true`，Preview 仍然保持 `false`。

Vercel 项目必须开启或确认可读取系统环境变量：

- `VERCEL_ENV`
- `VERCEL_URL`
- `VERCEL_PROJECT_PRODUCTION_URL`
- `VERCEL_GIT_COMMIT_SHA`

Vercel 项目的 Node.js Version 必须保持 `24.x`。如果 Vercel 页面没有单独显示 Node.js Version，确认仓库里的 `package.json` 包含：

```json
"engines": {
  "node": "24.x"
}
```

Preview 环境需要把 `VITE_INDEXING_ENABLED` 保持为 `false`。

Vercel Preview 必须满足：

- `DATABASE_URL` 指向 Preview 数据库；课程作业可以临时复用同一个 Neon 数据库
- `JWT_SECRET` 已配置
- `VITE_API_BASE_URL=/api`
- `VITE_INDEXING_ENABLED=false`
- `VITE_RELEASE_VERSION` 来自当前提交，或由 `VERCEL_GIT_COMMIT_SHA` 自动提供
- `/robots.txt` 返回 `Disallow: /`
- `/sitemap.xml` 和 `/site.webmanifest` 可访问，并且不是前端首页 HTML

Vercel Production 必须满足：

- `DATABASE_URL` 指向正式数据库
- `JWT_SECRET` 已配置；正式项目建议不同于 Preview，课程作业可以临时复用
- `VITE_API_BASE_URL=/api`
- `VITE_SITE_URL` 指向正式前端域名
- `VITE_INDEXING_ENABLED` 按发布目标设置；课程作业可以保持 `false`
- `VITE_RELEASE_VERSION` 来自当前发布提交，或由 `VERCEL_GIT_COMMIT_SHA` 自动提供
- `/robots.txt` 符合索引目标：课程作业或不收录时返回 `Disallow: /`；正式公开收录时返回 sitemap 地址
- `/sitemap.xml` 中没有 `example.com`
- `/site.webmanifest` 返回 JSON，不是前端首页 HTML

当前 `vercel.json` 的 SPA rewrite 只负责让 `/articles/123`、`/admin/articles` 这类前端路由刷新后还能回到 Vue 应用。Vercel 默认会先匹配真实存在的静态文件，再执行 rewrites，所以 `/robots.txt`、`/sitemap.xml`、`/site.webmanifest` 会按文件正常返回。

如果 Vercel 构建报 `Unsafe Vercel deployment environment`，先修正 Vercel 项目环境变量，再重新部署同一个提交。

如果本地执行 `vercel build`、`vercel pull` 或 `vercel deploy` 时提示 `The specified token is not valid`，这是本机 CLI 凭据问题，不代表项目构建失败。先执行：

```bash
npx vercel@latest logout
npx vercel@latest login
```

重新登录后再跑 CLI 预检。网页导入 GitHub 仓库部署不依赖本机 CLI 登录状态。

## 2.2 数据库初始化

首次使用新的数据库时，在本地把 `DATABASE_URL` 临时设为目标数据库的 direct 连接字符串后执行：

```powershell
$env:DATABASE_URL="你的 Neon direct 连接字符串"
# 可选：如果要在新数据库里创建自己的初始登录账号，先设置 SEED_* 覆盖变量
# $env:SEED_ADMIN_USERNAME="your_admin"
# $env:SEED_ADMIN_EMAIL="your-admin@example.com"
# $env:SEED_ADMIN_PASSWORD="YourAdminPassword123!"
# $env:SEED_AUTHOR_USERNAME="your_author"
# $env:SEED_AUTHOR_EMAIL="your-author@example.com"
# $env:SEED_AUTHOR_PASSWORD="YourAuthorPassword123!"
npm run db:migrate
npm run db:seed
Remove-Item Env:\DATABASE_URL
# 如果设置过 SEED_*，也建议在当前终端清掉对应临时变量
```

也可以把 `DATABASE_URL` 和 `SEED_*` 写进项目根目录的 `.env.local` 后直接执行 `npm run db:migrate` 和 `npm run db:seed`。数据库脚本会自动读取 `.env.local`，缺少 `.env.local` 时会后备读取 `.env`；当前终端里的非空 `DATABASE_URL` 优先于文件配置，空值会被忽略。

Neon 连接字符串建议：

- Vercel 的 `DATABASE_URL` 推荐使用 pooled 连接字符串，通常地址里带 `-pooler`。
- 本地执行 `db:migrate` 和 `db:seed` 时优先使用 direct 连接字符串，通常地址里不带 `-pooler`。
- `db:migrate` 会逐条执行 `schema.sql` 中的 SQL 语句，降低 Neon HTTP driver 或连接池模式下一次提交多条语句导致失败的风险。
- 如果你只拿到了 pooled 连接字符串，也可以先尝试；若遇到 pooler、connection pool 或 prepared statement 相关错误，再临时改用 Neon 的 direct 连接字符串执行 `db:migrate` 和 `db:seed`。
- 迁移和种子数据完成后，Vercel 项目里仍然保留 pooled 连接字符串。

成功标准：

- 控制台输出 `Database migration complete`
- 控制台输出 `Database seed complete`
- 当前 PowerShell 里的临时 `DATABASE_URL` 已用 `Remove-Item Env:\DATABASE_URL` 清掉
- `db:seed` 创建的作者账号可登录；未设置 `SEED_AUTHOR_*` 时默认为 `author_demo / Author123456!`
- `db:seed` 创建的管理员账号可登录；未设置 `SEED_ADMIN_*` 时默认为 `admin / Admin123456!`

## 3. Preview 发布检查

如果只是课程作业，而且你只部署一次 Production，可以跳过单独 Preview 检查，直接做第 4.1 节和第 9 节的线上业务验收。

正式项目在推送前或生成 Preview 后，至少完成以下检查：

1. 打开首页，确认页面可以正常渲染。
2. 访问 `/api/health`，确认返回 JSON 且 `code` 为 `0`。
3. 访问 `/api/categories`，确认返回 JSON 且 `code` 为 `0`。
4. 打开登录页和注册页，确认页面可以正常打开。
5. 打开一篇公开文章详情，确认正文、右侧信息区和最近浏览模块正常显示。
6. 使用测试账号进入作者端，确认 `/writer`、`/writer/articles`、`/writer/articles/:id/edit` 可以正常访问。
7. 使用管理员账号进入后台，确认 `/admin`、`/admin/articles`、`/admin/categories`、`/admin/tags`、`/admin/users` 可以正常访问。
8. 浏览器刷新任意前端路由，确认不会出现 404。
9. 访问 `/robots.txt`、`/sitemap.xml` 与 `/site.webmanifest`，确认静态资源可访问，并且没有被 SPA 回退改成首页 HTML。

## 4. 失败恢复检查

至少抽查一组失败恢复场景，确认上线后不是“首屏能开，但失败时直接崩掉”。

建议检查：

1. 公开文章详情请求失败时，会显示错误文案、恢复建议和“重新加载”按钮。
2. 作者编辑器首屏详情失败时，点击“重新加载”可以恢复表单。
3. 后台分类页或标签页首屏失败时，点击“重新加载”可以恢复列表。
4. 后台文章详情在已有内容时再次失败，不会把旧详情整体清空。

## 4.1 全栈业务验收

数据库迁移、种子数据和 Preview 部署完成后，按下面顺序验收：

1. 公开首页：文章列表、分类筛选、标签筛选、关键词搜索都能返回真实数据库数据。
2. 公开文章详情：Markdown 渲染正常，上一篇/下一篇链接正常。
3. 作者注册：新账号注册后可以进入 `/writer`。
4. 作者登录：`db:seed` 创建的作者账号可以登录；未设置 `SEED_AUTHOR_*` 时使用 `author_demo / Author123456!`。
5. 作者工作区：可以创建草稿、发布文章、编辑文章、删除文章。
6. 个人资料页：可以更新昵称、头像和简介。
7. 管理员登录：`db:seed` 创建的管理员账号可以登录；未设置 `SEED_ADMIN_*` 时使用 `admin / Admin123456!`。
8. 管理员文章：可以列表、查看、编辑、删除文章。
9. 管理员分类：可以创建、编辑、删除未被引用的分类，被引用分类删除会被阻止。
10. 管理员标签：可以创建、编辑、删除未被引用的标签，被引用标签删除会被阻止。
11. 管理员用户：可以列表、查看详情、禁用/启用作者，有文章的作者删除会被阻止。
12. 深层路由刷新：`/articles/:id`、`/writer/articles`、`/admin/articles` 刷新后不出现 404。

## 5. 观测检查

如果当前环境启用了观测，发布前至少确认一次事件链路是通的。

检查要点：

- 页面运行时错误可被上报
- 路由跳转错误可被上报
- 关键接口失败可被上报
- 事件里能区分当前 `release version`

如果观测平台收不到事件，不要把“已接入观测”当成完成项。

## 6. Production 发布前确认

正式发布前再次确认：

1. 最近一次 CI 通过。
2. Preview 验收已经完成；课程作业如果只做 Production，可以改为确认第 4.1 节的线上业务验收已经完成。
3. 平台环境变量与目标环境一致。
4. 当前要发布的提交与本地通过 `verify` 的提交一致。
5. 已知不阻塞项已经记录，例如当前存在的 chunk 体积提示。

## 7. CI 或云端构建失败定位

当前仓库不要求先配置 GitHub Actions 才能部署到 Vercel。如果你后续添加了 GitHub Actions，建议把质量门禁拆成五个步骤：

- `Lint source code`
- `Run unit tests`
- `Run backend tests`
- `Run smoke tests`
- `Build production bundle`

排查建议：

- `Lint source code` 失败：先在本地执行 `npm run lint`
- `Run unit tests` 失败：先在本地执行 `npm run test:unit`
- `Run backend tests` 失败：先在本地执行 `npm run test:backend`
- `Run smoke tests` 失败：先在本地执行 `npm run test:smoke`
- `Build production bundle` 失败：先在本地执行 `npm run build`

如果 CI 失败但本地通过，优先检查：

- 是否漏推了最新提交
- CI 或 Vercel 的 Node 版本是否为 `24.x`
- 是否存在只在 CI 环境才暴露的大小写、路径或环境变量问题

## 8. 当前已知非阻塞项

当前项目存在但不阻塞本次发布的事项：

- 编辑器和 Markdown 语法高亮资源体积偏大，课程作业不阻塞；如后续做正式公开项目，再考虑进一步拆包和按需加载
- 当前鉴权仍是前端 Bearer Token 模式，只是已收口到 `sessionStorage`
- 更系统的 E2E、包体积优化、SEO 细化仍可继续补强

## 8.1 Vercel 回滚

如果 Production 发布后出现阻塞问题：

1. 在 Vercel Deployments 页面找到上一版通过验收的 Production 部署。
2. 点击 Promote to Production。
3. 发布完成后重新检查首页、文章详情、登录页和后台入口。
4. 在当前问题分支修复后重新走 Preview 验收，不直接覆盖回滚版本。

## 8.2 当前部署验收记录

记录日期：2026-05-31

已完成：

- 本地 `npm run verify` 已覆盖 lint、前端单元测试、后端 API 测试、smoke 测试和生产构建。
- 前端已改为 `VITE_API_BASE_URL=/api`，同源访问 Vercel API Functions。
- 后端 API 合约已补充到 `docs/backend-api-contract.md`。
- `package.json` 已固定 `engines.node=24.x`，Vercel 与本机 Node 主版本保持一致。
- `package-lock.json` 已统一为 npm 官方 registry，Vercel 执行 `npm ci` 时不依赖本机镜像源。
- `npm ci --dry-run` 已通过，确认 lockfile 和项目级 `.npmrc` 可按 Vercel 的安装方式解析。
- 生产依赖审计命令 `npm audit --omit=dev` 当前为 0 个漏洞。
- 已模拟 Vercel Production 环境构建，确认未手动填写 `VITE_SITE_URL` 和 `VITE_RELEASE_VERSION` 时，系统环境变量可生成 `robots.txt`、`sitemap.xml` 和发布版本号。
- 已模拟 Vercel Preview 环境构建，确认未手动填写 `VITE_SITE_URL` 和 `VITE_RELEASE_VERSION` 时，系统环境变量可生成预览域名 sitemap，并保持 `robots.txt` 禁止索引。
- 已用 Vite preview 检查生产构建产物，`/`、`/articles/123`、`/admin/articles`、`/login`、`/admin/login` 都能返回前端 app shell，`robots.txt`、`sitemap.xml` 和 `site.webmanifest` 可访问。
- 已用 Playwright 检查本地生产预览：桌面首页可渲染，搜索框交互会写入 `keyword=vue`，移动端 `/login` 表单可见，浏览器未捕获 console error 或 page error。
- Vercel CLI 登录账号与项目归属需要由接手人自行确认；网页导入 GitHub 仓库部署时不依赖本机 CLI 登录状态。

待配置后执行：

- 数据库提供商：待创建，推荐 Neon 或 PostgreSQL。
- Preview URL：待 Vercel 部署生成。
- Production URL：待正式发布后填写。
- 如果使用 GitHub Actions，需另行创建工作流并包含 `npm run verify`。

本次跳过项及原因：

- `npm run db:migrate`：当前本机未配置 `DATABASE_URL`，不能安全连接真实数据库。
- `npm run db:seed`：当前本机未配置 `DATABASE_URL`，不能写入真实数据库。
- `npx vercel build --prod --yes --project blog`：Vercel CLI 已登录，但当前账号作用域下还没有名为 `blog` 的 Vercel 项目，返回 `project_not_found`。先在 Vercel 网页导入 GitHub 仓库，或用正确的团队/账号 scope 后再执行。
- Preview `/api/health` 和人工业务验收：当前还没有 Vercel Preview URL。

## 9. 推荐发布顺序

课程作业最短推荐顺序：

1. 本地执行 `npm run verify`
2. 把代码推送到 GitHub 的生产分支。当前本地分支是 `master`；如果接手人改用 `main`，GitHub 和 Vercel Production Branch 也要保持为 `main`
3. 在真实 Neon/PostgreSQL 数据库上执行 `npm run db:migrate` 和 `npm run db:seed`
4. 在 Vercel 直接部署 Production
5. 发布后快速回归首页、公开文章、登录链路和后台入口

正式项目推荐顺序：

1. 本地执行 `npm run verify`
2. 如果仓库配置了 CI，推送代码并等待 CI 通过；如果没有 CI，确认本地 `npm run verify` 已通过
3. 在真实 Neon/PostgreSQL 数据库上执行 `npm run db:migrate` 和 `npm run db:seed`
4. 部署 Preview
5. 按本清单完成 Preview 验收与观测检查
6. 发布 Production
7. 发布后快速回归首页、公开文章、登录链路和后台入口
