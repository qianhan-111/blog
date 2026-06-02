# Blog Platform

一个基于 Vue 3、TypeScript、Vite、PostgreSQL 和 Vercel Serverless Functions 的全栈博客系统。

## 功能特性

- 公开博客首页：文章列表、关键词搜索、分类筛选、标签筛选
- 公开文章详情页：Markdown 正文展示、文章元信息展示
- 作者注册与登录
- 作者工作区：创建草稿、发布文章、编辑文章、删除文章
- 作者个人资料编辑
- 管理员登录与后台首页
- 管理员文章管理
- 管理员分类管理
- 管理员标签管理
- 管理员用户管理
- 基于角色的接口权限控制
- PostgreSQL 数据持久化
- 数据库迁移与种子数据脚本
- 支持 Vercel 前端和后端接口一体化部署

## 技术栈

- Vue 3
- TypeScript
- Vite
- Pinia
- Vue Router
- Element Plus
- PostgreSQL
- Neon serverless PostgreSQL client
- Vercel Serverless Functions
- Vitest
- ESLint

## 项目结构

```text
api/              Vercel API Functions
public/           静态资源
scripts/          数据库迁移与种子数据脚本
src/              前端源码和后端共享模块
src/server/       后端服务、仓储、认证、校验和数据库工具
tests/            前端测试、后端测试和冒烟测试
```

## 运行要求

- Node.js 24.x，本项目和 Vercel 部署已固定到这个主版本
- npm
- PostgreSQL 数据库

## 环境变量

部署或本地连接真实后端时需要配置以下环境变量：

```dotenv
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN_SECONDS=86400
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Blog Platform
VITE_SITE_URL=
VITE_INDEXING_ENABLED=false
VITE_OBSERVABILITY_ENABLED=false
VITE_OBSERVABILITY_DSN=
# 本地开发可用 local；Vercel 部署不要填 local
VITE_RELEASE_VERSION=local

# 可选：覆盖 db:seed 创建的演示登录账号；留空则使用 README 里的默认演示账号
SEED_ADMIN_USERNAME=
SEED_ADMIN_EMAIL=
SEED_ADMIN_PASSWORD=
SEED_ADMIN_NICKNAME=
SEED_ADMIN_BIO=
SEED_AUTHOR_USERNAME=
SEED_AUTHOR_EMAIL=
SEED_AUTHOR_PASSWORD=
SEED_AUTHOR_NICKNAME=
SEED_AUTHOR_BIO=
```

说明：

- `DATABASE_URL` 是 PostgreSQL 数据库连接字符串。
- `JWT_SECRET` 是后端签发登录令牌使用的密钥，至少 32 个字符，生产环境必须使用随机字符串。
- `JWT_EXPIRES_IN_SECONDS` 控制登录令牌有效期。
- `VITE_API_BASE_URL=/api` 表示前端调用同源部署下的后端接口。
- `VITE_SITE_URL` 用于生成 `robots.txt` 和 `sitemap.xml`，生产环境建议填真实的 `https://` 站点地址；如果 Vercel 系统环境变量已暴露，项目也能从 `VERCEL_PROJECT_PRODUCTION_URL` 或 `VERCEL_URL` 推导。
- `VITE_INDEXING_ENABLED` 控制是否允许搜索引擎索引，生产环境可设为 `true`，预览环境必须设为 `false`。
- `VITE_OBSERVABILITY_ENABLED` 和 `VITE_OBSERVABILITY_DSN` 用于观测上报配置；只有启用观测时才需要填写 DSN。课程作业保持 `VITE_OBSERVABILITY_ENABLED=false` 时，Vercel 里可以不添加 `VITE_OBSERVABILITY_DSN`。
- `VITE_RELEASE_VERSION` 用于标记当前构建版本，Vercel 部署时可填提交号、构建号或语义化版本号；如果留空，项目会优先使用 Vercel 的 `VERCEL_GIT_COMMIT_SHA`，但不能最终变成空值、`local`、`dev`、`test` 或 `production`。
- `SEED_ADMIN_*` 和 `SEED_AUTHOR_*` 只影响 `npm run db:seed` 创建或更新的初始账号。交接给别人时建议让接手人设置自己的用户名、邮箱和密码后再执行种子脚本。

## 安装依赖

```bash
npm ci
```

## 本地开发

```bash
npm run dev
```

`npm run dev` 只启动前端 Vite 开发服务器。这个项目的后端接口放在 Vercel Serverless Functions 里，完整登录、发文和后台流程以 Vercel 部署后的网址为准；课程作业按下面部署步骤走，可以不在本地把完整前后端跑通。

## 数据库

执行数据库结构迁移：

```bash
npm run db:migrate
```

写入演示数据：

```bash
npm run db:seed
```

种子数据默认会创建以下演示账号：

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 作者 | `author_demo` | `Author123456!` |
| 管理员 | `admin` | `Admin123456!` |

如果不想使用默认演示账号，可以在执行 `npm run db:seed` 前设置覆盖变量。例如 Windows PowerShell：

```powershell
$env:SEED_ADMIN_USERNAME='your_admin'
$env:SEED_ADMIN_EMAIL='your-admin@example.com'
$env:SEED_ADMIN_PASSWORD='YourAdminPassword123!'
$env:SEED_AUTHOR_USERNAME='your_author'
$env:SEED_AUTHOR_EMAIL='your-author@example.com'
$env:SEED_AUTHOR_PASSWORD='YourAuthorPassword123!'
npm run db:seed
Remove-Item Env:\SEED_ADMIN_USERNAME, Env:\SEED_ADMIN_EMAIL, Env:\SEED_ADMIN_PASSWORD, Env:\SEED_AUTHOR_USERNAME, Env:\SEED_AUTHOR_EMAIL, Env:\SEED_AUTHOR_PASSWORD
```

## 常用脚本

```bash
npm run lint
npm run typecheck
npm run test:unit
npm run test:backend
npm run test:smoke
npm run build
npm run verify
npm run package:handoff
```

`npm run verify` 会依次执行代码规范检查、前端单元测试、后端测试、冒烟测试和生产构建。

测试覆盖率报告会分别输出到 `coverage/unit`、`coverage/backend` 和 `coverage/smoke`，所以同时运行不同测试脚本时不会互相删除临时覆盖率文件。

## 交接给同学

如果不通过 GitHub 仓库交接，而是直接发压缩包，推荐在项目根目录执行：

```powershell
npm run package:handoff
```

脚本会生成 `output/blog-handoff.zip`，只打包 Git 中未被忽略的源码、配置和正式文档，并排除本地环境文件、构建产物、过程文档和依赖目录。不要手动全选整个工作目录压缩，因为当前目录里可能存在 `.vercel/`、`coverage/`、`node_modules/`、`docs/plans/`、`docs/superpowers/` 等本地文件。

压缩包保留范围：

- 保留：`.github/`、`api/`、`public/`、`scripts/`、`src/`、`tests/`、`package.json`、`package-lock.json`、`README.md`、`.env.example`、`.npmrc`、`index.html`、`vite.config.ts`、`vitest*.ts`、`vercel.json`、`tsconfig*.json`、`eslint.config.mjs`
- 保留正式教程文档：`docs/backend-api-contract.md`、`docs/release-preflight-checklist.md`、`docs/zero-basic-vercel-deployment-tutorial.md`
- 保留给同学单独转发的中文短版文档：`docs/给同学的交接文档/01-文件接收入手教程.md`、`docs/给同学的交接文档/02-后续部署配置教程.md`
- 排除：`.git/`、`node_modules/`、`dist/`、`coverage/`、`.vercel/`、`.playwright-cli/`、`output/`、`.trae/`、`docs/plans/`、`docs/superpowers/`、`.env`、`.env.local`、`.env.*.local`、真实数据库连接字符串和真实 `JWT_SECRET`

课程材料如果要一起发，再单独附 `docs/题目.md` 和 `docs/博客系统详细设计文档-正式版.md`；不要放进项目交接压缩包。

如果要先单独给同学发文档，让对方按这个顺序看：

1. `docs/给同学的交接文档/01-文件接收入手教程.md`
2. `docs/给同学的交接文档/02-后续部署配置教程.md`
3. `README.md`
4. `docs/zero-basic-vercel-deployment-tutorial.md`
5. `docs/release-preflight-checklist.md`

接手人需要自己准备 GitHub、Neon 和 Vercel 账号，重新填写 `DATABASE_URL`、`JWT_SECRET`、`VITE_SITE_URL` 等环境变量。首次执行 `npm run db:seed` 前，建议设置 `SEED_ADMIN_*` 和 `SEED_AUTHOR_*`，让数据库创建接手人自己的管理员和作者账号。

## 部署

下面按“完全没有部署经验”的路径说明。照做时不要跳过数据库迁移和上线后验证，否则页面可能能打开，但登录、文章和后台接口会失败。

涉及 GitHub、Neon、Vercel 的登录、邮箱验证和浏览器授权，都需要账号所有者本人完成。课程作业排查时，优先发送部署失败日志、公开网址、接口返回内容和页面截图；涉及 `DATABASE_URL`、`JWT_SECRET` 时先打码。确实临时暴露真实值给别人排查后，要在 Neon 或 Vercel 重新生成并替换对应密钥；不要把这些真实值提交到 GitHub、写进 README、公开文档或压缩包。

### 1. 准备账号和工具

先准备：

- 一个 GitHub 账号，用来存放这个项目代码。
- 一个 Vercel 账号，用来部署前端和 `api/` 里的 Serverless Functions。
- 一个 Neon 账号，用来创建 PostgreSQL 数据库。
- 本机已安装 Node.js 24.x，并且能在项目目录执行 `npm` 命令。项目的 `package.json` 已用 `engines.node=24.x` 固定 Vercel 运行时。

在项目根目录安装依赖并跑一次完整检查：

```bash
npm ci
npm run verify
```

如果 `npm run verify` 失败，先修复失败项再继续部署。

### 2. 创建 Neon PostgreSQL 数据库

1. 登录 Neon 控制台。
2. 新建一个 Project。
3. 使用默认创建的数据库和分支即可。
4. 在 Neon 的连接信息里复制 PostgreSQL 连接字符串。
5. 建议保存两条连接字符串：
   - direct connection string：本地执行 `db:migrate` 和 `db:seed` 时优先使用，地址通常不带 `-pooler`
   - pooled connection string：填到 Vercel 的 `DATABASE_URL`，地址通常带 `-pooler`

连接字符串形如：

```text
postgresql://user:password@host/dbname?sslmode=require
```

后面本地 PowerShell 里临时设置 `DATABASE_URL` 时，优先填 direct connection string。Vercel 环境变量里的 `DATABASE_URL` 填 pooled connection string。如果你只复制了一条 pooled 连接字符串，通常也能跑；但迁移或种子数据一旦遇到 pooler、connection pool、prepared statement 相关错误，就改用 direct 字符串重新执行本地初始化。

### 3. 准备本地环境变量

复制环境变量模板：

```bash
cp .env.example .env.local
```

如果在 Windows PowerShell 中没有 `cp`，执行：

```powershell
Copy-Item .env.example .env.local
```

打开 `.env.local`，至少填好这几项：

```dotenv
DATABASE_URL=<刚才从 Neon 复制的 direct 连接字符串>
JWT_SECRET=<至少 32 个字符的随机字符串>
JWT_EXPIRES_IN_SECONDS=86400
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Blog Platform
VITE_SITE_URL=http://localhost:5173
VITE_INDEXING_ENABLED=false
VITE_OBSERVABILITY_ENABLED=false
VITE_OBSERVABILITY_DSN=
VITE_RELEASE_VERSION=local
# 可选：如果要让 db:seed 创建自己的交接账号，就填写下面几项
SEED_ADMIN_USERNAME=<管理员用户名>
SEED_ADMIN_EMAIL=<管理员邮箱>
SEED_ADMIN_PASSWORD=<管理员密码>
SEED_AUTHOR_USERNAME=<作者用户名>
SEED_AUTHOR_EMAIL=<作者邮箱>
SEED_AUTHOR_PASSWORD=<作者密码>
```

在 PowerShell 里可以这样生成一个可用的 `JWT_SECRET`：

```powershell
[Convert]::ToBase64String((1..48 | ForEach-Object { Get-Random -Maximum 256 }))
```

把输出结果完整复制到 `JWT_SECRET=` 后面。

### 4. 初始化数据库

确认 `.env.local` 已经填好 `DATABASE_URL` 后，在项目根目录执行：

```bash
npm run db:migrate
npm run db:seed
```

数据库脚本会自动读取 `.env.local`。如果你没有创建 `.env.local`，也可以在 Windows PowerShell 里临时设置环境变量后再执行：

```powershell
$env:DATABASE_URL='<你的 Neon direct 连接字符串>'
npm run db:migrate
npm run db:seed
Remove-Item Env:\DATABASE_URL
```

如果 `.env.local` 和当前终端都设置了 `DATABASE_URL`，当前终端里的非空值优先；空值会被忽略，避免挡住 `.env.local`。

`npm run db:migrate` 会创建数据库表。`npm run db:seed` 会写入演示数据。没有填写 `SEED_*` 覆盖变量时，会创建以下默认登录账号：

| 角色 | 登录地址 | 用户名 | 密码 |
| --- | --- | --- | --- |
| 作者 | `/login` | `author_demo` | `Author123456!` |
| 管理员 | `/admin/login` | `admin` | `Admin123456!` |

如果已经填写 `SEED_ADMIN_*` 和 `SEED_AUTHOR_*`，就使用自己设置的账号登录。上线后如果继续使用默认演示账号，请尽快在数据库中替换默认密码，或删除演示账号后重新创建自己的账号。

### 5. 推送代码到 GitHub

确认代码已经提交到 Git 仓库，然后推送到 GitHub。

```bash
git status
git add .
git commit -m "Prepare deployment"
git push
```

如果 `git status` 显示没有需要提交的内容，可以跳过 `git add` 和 `git commit`，直接确认代码已经在 GitHub 仓库里。

不要把 `.env.local`、数据库密码或 `JWT_SECRET` 提交到 GitHub。

### 6. 在 Vercel 导入项目

1. 登录 Vercel。
2. 选择 Add New Project。
3. 选择刚才的 GitHub 仓库并导入。
4. Framework Preset 选择 `Vite`。
5. 保持以下配置：

| 配置项 | 值 |
| --- | --- |
| Install Command | `npm ci` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Node.js Version | `24.x`，保持和 `package.json` 的 `engines.node` 一致 |

项目根目录已有 `vercel.json`，会自动处理 `api/` 接口和前端 SPA 路由回退。Vercel 会先查找真实存在的静态文件，再执行 rewrites，所以 `/robots.txt`、`/sitemap.xml`、`/site.webmanifest` 不会被前端路由回退覆盖。

### 7. 配置 Vercel 环境变量

在 Vercel 项目的 Settings -> Environment Variables 中添加变量。变量要按环境区分，不要把 Production 的配置无脑复制到 Preview。

先确认 `Automatically expose System Environment Variables` 已开启。项目会使用 `VERCEL_ENV`、`VERCEL_URL`、`VERCEL_PROJECT_PRODUCTION_URL` 和 `VERCEL_GIT_COMMIT_SHA` 自动推导部署环境、站点地址和发布版本。

Production 环境填写。课程作业建议先把 `VITE_INDEXING_ENABLED` 也设为 `false`，只要老师能打开链接即可；如果这是正式公开网站，并且希望搜索引擎收录，再改成 `true`。

```dotenv
DATABASE_URL=<Neon PostgreSQL pooled 连接字符串>
JWT_SECRET=<至少 32 个字符的随机字符串>
JWT_EXPIRES_IN_SECONDS=86400
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Blog Platform
VITE_INDEXING_ENABLED=false
VITE_OBSERVABILITY_ENABLED=false
VITE_OBSERVABILITY_DSN=
# VITE_RELEASE_VERSION 可省略；省略时使用 VERCEL_GIT_COMMIT_SHA
```

如果 Vercel 不允许保存空的 `VITE_OBSERVABILITY_DSN`，直接不添加这个变量即可。

第一次部署时可以先不填 `VITE_SITE_URL`。项目会临时使用 Vercel 自动提供的域名生成部署资源。第一次部署成功后，在 Vercel 的 Domains 页面复制最终生产域名，再回到 Environment Variables 补上：

```dotenv
VITE_SITE_URL=https://你的生产域名
```

如果还没有自定义域名，可以先使用 Vercel 分配的生产域名，例如：

```dotenv
VITE_SITE_URL=https://your-project.vercel.app
```

Preview 环境填写：

```dotenv
DATABASE_URL=<Neon PostgreSQL pooled 连接字符串>
JWT_SECRET=<至少 32 个字符的随机字符串>
JWT_EXPIRES_IN_SECONDS=86400
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Blog Platform
VITE_INDEXING_ENABLED=false
VITE_OBSERVABILITY_ENABLED=false
VITE_OBSERVABILITY_DSN=
# VITE_RELEASE_VERSION 可省略；省略时使用 VERCEL_GIT_COMMIT_SHA
```

如果 Vercel 不允许保存空的 `VITE_OBSERVABILITY_DSN`，Preview 环境也可以不添加这个变量。

Preview 环境可以不填 `VITE_SITE_URL`，让项目使用 Vercel 自动生成的预览域名。Preview 环境必须保持 `VITE_INDEXING_ENABLED=false`，否则构建会失败。

如果你没有开启 Vercel 系统环境变量自动暴露，或构建提示 `VITE_RELEASE_VERSION` 缺失，可以手动获取当前 Git 提交号：

```bash
git rev-parse --short HEAD
```

把输出填到 `VITE_RELEASE_VERSION`，例如 `a1b2c3d`。也可以填 `v1.0.0` 这类版本号。

### 8. 首次部署

保存环境变量后，在 Vercel 点击 Deploy。

如果第一次部署成功，但你后面补填了 `VITE_SITE_URL`，需要再点一次 Redeploy，让 `robots.txt` 和 `sitemap.xml` 使用最终生产域名重新生成。

### 9. 上线后验证

把下面的 `https://你的生产域名` 换成 Vercel 里的生产访问地址，逐项检查：

1. 打开 `https://你的生产域名/`，首页能看到文章列表。
2. 打开 `https://你的生产域名/api/health`，应返回包含 `"status":"ok"` 的 JSON。
3. 打开 `https://你的生产域名/login`，用 `db:seed` 创建的作者账号登录。如果没有覆盖 `SEED_AUTHOR_*`，默认是 `author_demo` / `Author123456!`。
4. 进入 `/writer/articles/new`，新建一篇草稿，再发布。
5. 打开 `https://你的生产域名/admin/login`，用 `db:seed` 创建的管理员账号登录。如果没有覆盖 `SEED_ADMIN_*`，默认是 `admin` / `Admin123456!`。
6. 进入 `/admin/articles`、`/admin/categories`、`/admin/tags`、`/admin/users`，确认列表能加载。
7. 打开 `https://你的生产域名/robots.txt`。如果 `VITE_INDEXING_ENABLED=false`，应看到 `Disallow: /`；如果设为 `true`，应看到 `Allow: /` 和 sitemap 地址。
8. 打开 `https://你的生产域名/sitemap.xml`，确认里面的域名是最终生产域名。
9. 打开 `https://你的生产域名/site.webmanifest`，确认不是首页 HTML，而是一段 JSON。

### 10. 常见问题

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| Vercel 构建失败并提示 `VITE_API_BASE_URL` | API 地址为空、写成 localhost，或写成 example 地址 | 同源部署填 `/api` |
| Vercel 构建失败并提示 `VITE_SITE_URL` | 站点地址为空且无法从 Vercel 系统环境变量推导，或写成 localhost/example | 开启 Vercel 系统环境变量自动暴露，或在 Production 填真实 `https://` 域名 |
| Vercel 构建失败并提示 `VITE_RELEASE_VERSION` | 版本号为空，系统环境变量没有提供提交号，或填了 `local`、`dev`、`test`、`production` | 开启 Vercel 系统环境变量自动暴露，或填 `git rev-parse --short HEAD` 的输出 |
| Preview 构建失败并提示索引配置 | Preview 环境设置了 `VITE_INDEXING_ENABLED=true` | Preview 改成 `false` |
| 接口返回 `后端数据库未配置` | Vercel 没有配置 `DATABASE_URL` | 在 Environment Variables 填入 Neon 连接字符串并重新部署 |
| 接口返回 `JWT 密钥未正确配置` | `JWT_SECRET` 没填或少于 32 个字符 | 重新生成至少 32 个字符的随机字符串并重新部署 |
| 登录提示账号或密码错误 | 没有执行 `db:seed`，账号被改过，或初始化时使用了 `SEED_*` 覆盖变量 | 先确认迁移和种子脚本已执行，再使用初始化时设置的账号登录；没有覆盖时才使用默认演示账号 |
| 首页能打开但文章为空 | 数据库没有种子数据，或连接到了另一个空数据库 | 检查 `DATABASE_URL` 是否正确，再按“初始化数据库”执行种子脚本 |
| 本地 Vercel CLI 提示 `The specified token is not valid` | 本机保存的 Vercel 登录 token 过期或无效 | 执行 `npx vercel@latest logout` 后重新 `npx vercel@latest login`；网页导入部署可不依赖本机 CLI |
| 本地 Vercel CLI 提示 `project_not_found` 或 `Project "blog" was not found` | 当前登录的 Vercel 账号或团队里还没有导入这个项目，或 scope 选错了 | 先在 Vercel 网页用 GitHub 导入 `blog` 仓库；如果项目在团队里，CLI 命令加 `--scope <团队或账号名>` |

当前项目已按 Vercel 部署方式配置：

- Framework: Vite
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js Version: `24.x`
- npm Registry: 项目级 `.npmrc` 固定为 `https://registry.npmjs.org/`
- API Functions: `api/`
- SPA 路由回退会排除 `/api/*`

## API 响应格式

所有接口使用统一 JSON 响应结构：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

需要登录的接口使用 Bearer Token：

```http
Authorization: Bearer <token>
```
