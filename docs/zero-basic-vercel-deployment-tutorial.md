# 零基础上线教程：把当前博客项目部署到 Vercel

本文档假设你完全不了解部署、后端、数据库、环境变量。你只需要按顺序做，每一步都尽量写到鼠标点击和输入内容。

本文档针对当前项目编写，不是通用教程。项目路径以接手人解压或克隆后的本地目录为准。后文里的 `<项目目录>` 都替换成你电脑上的真实路径，例如：

```text
D:\projects\blog
```

当前项目是：

- 前端：Vue 3 + Vite
- 后端：Vercel Serverless Functions，代码在 `api/`
- 数据库：PostgreSQL，推荐 Neon
- 部署平台：Vercel
- API 地址：同一个网站下面的 `/api`
- 当前本地 Git 分支：`master`；接手人也可以改用 `main`，但 GitHub、Vercel Production Branch 和推送命令要保持一致
- GitHub 远程仓库：接手人自己的仓库地址，例如 `https://github.com/你的用户名/blog.git`
- GitHub 仓库名：建议使用 `blog`，也可以按课程要求改名
- 当前 `vercel.json` 已配置：
  - `framework`: `vite`
  - `installCommand`: `npm ci`
  - `buildCommand`: `npm run build`
  - `outputDirectory`: `dist`
  - `/api/*` 不走前端页面回退

## 官方资料依据

我查阅并结合了这些官方资料：

- [GitHub 创建新仓库文档](https://docs.github.com/en/repositories/creating-and-managing-repositories/creating-a-new-repository)
- [Neon 连接数据库文档](https://neon.com/docs/get-started/connect-neon)
- [Neon 连接池文档](https://neon.com/docs/connect/connection-pooling)
- [Vercel Git 部署文档](https://vercel.com/docs/git)
- [Vercel 环境变量文档](https://vercel.com/docs/environment-variables/managing-environment-variables)
- [Vercel 系统环境变量文档](https://vercel.com/docs/environment-variables/system-environment-variables)
- [Vercel Node.js 版本文档](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions)
- [Vercel 项目配置文档](https://vercel.com/docs/project-configuration)

这些资料确认了几个关键点：

- GitHub 新建仓库时，如果你要上传已有项目，不要勾选自动生成 README、`.gitignore` 或 license。
- Neon 的数据库连接字符串从项目 Dashboard 的 Connect 按钮复制。
- Neon 推荐把连接字符串放进环境变量，比如 `DATABASE_URL`，不要写死进代码。
- Neon pooled 连接字符串的主机名通常带 `-pooler`，适合部署到 Vercel 这类会产生并发连接的平台。
- 本地执行数据库迁移和种子数据时，优先用 Neon direct 连接字符串；Vercel 的 `DATABASE_URL` 用 pooled 连接字符串。
- Vercel 可以从 GitHub 仓库导入项目，点击 New Project 后选择仓库、配置构建和环境变量。
- Vercel 环境变量变更不会影响已经生成的旧部署，改完变量后需要重新部署。
- Vercel 支持 Node.js 24.x，并且 `package.json` 里的 `engines.node=24.x` 会让部署使用最新的 24.x 运行时。
- Vercel 的 `VERCEL_ENV`、`VERCEL_URL`、`VERCEL_PROJECT_PRODUCTION_URL`、`VERCEL_GIT_COMMIT_SHA` 可以帮助项目自动识别当前环境、域名和提交号；其中 `VERCEL_URL` 和 `VERCEL_PROJECT_PRODUCTION_URL` 是不带 `https://` 的域名。
- Vercel 会使用 Git 仓库的生产分支来触发生产部署。当前本地项目分支是 `master`；如果接手人改用 `main`，就在 GitHub 和 Vercel 里都确认生产分支也是 `main`。仓库里的 GitHub Actions 已同时监听 `master` 和 `main`。

## 你要准备的账号

你需要 3 个网站账号：

1. GitHub：用来存放代码。
2. Neon：用来创建 PostgreSQL 数据库。
3. Vercel：用来部署上线。

推荐都用同一个邮箱注册，最省事。

## 哪些需要你本人操作

账号登录、邮箱验证和浏览器授权需要你本人手动完成。原因不是项目安全要求很高，而是这些步骤会跳到你的浏览器、邮箱或网站后台，我不能替你点击外部网站里的确认按钮。

必须你本人操作的步骤：

1. 登录 GitHub、Neon、Vercel。
2. 在浏览器里点击 GitHub 或 Vercel 的授权按钮。
3. 打开邮箱里的登录确认邮件。
4. 从 Neon 复制真实 direct 和 pooled 数据库连接字符串。
5. 在 Vercel 网页里粘贴 `DATABASE_URL` 和 `JWT_SECRET`。
6. 如果使用 Vercel CLI，在终端执行 `npx vercel@latest login` 后完成邮箱或浏览器确认。

Codex 可以继续帮你做的事：

1. 检查代码、测试、构建和文档。
2. 告诉你当前页面下一步该点哪里。
3. 判断某个环境变量应该填什么类型的值。
4. 根据报错日志判断哪里错了。
5. 在你完成账号登录后，帮你运行本地检查、数据库初始化、Vercel CLI 检查或部署命令。
6. 修改项目代码和部署教程。

可以发给 Codex 的内容：

- Vercel 构建日志最后 30 行
- 浏览器地址栏里的公开 Vercel 网址
- `/api/health` 的返回内容
- `/api/categories` 的返回内容
- 你卡住的页面截图
- 如果怀疑是 `DATABASE_URL` 或 `JWT_SECRET` 问题，优先发送打码后的值和完整错误；确实临时暴露真实值给别人排查后，要在 Neon 或 Vercel 重新生成并替换对应密钥。

## 课程作业最快路线

如果你只是为了完成课程作业，不想先读完整篇长教程，可以先按这条最短路线走。遇到不会点的页面，再回到后面的详细步骤查。

1. 在 VS Code 打开解压或克隆后的 `<项目目录>`。
2. 在终端执行 `npm ci`。
3. 在终端执行 `npm run verify`。
4. 把项目推到 GitHub 的生产分支。当前本地分支是 `master`；如果你改成了 `main`，后面的 `master` 命令也要对应替换成 `main`。
5. 在 Neon 创建 PostgreSQL 数据库，复制 direct 和 pooled 两条连接字符串。
6. 在本地 PowerShell 临时设置 `$env:DATABASE_URL="你的 Neon direct 连接字符串"`。
7. 执行 `npm run db:migrate` 和 `npm run db:seed`。
8. 执行 `Remove-Item Env:\DATABASE_URL`，清掉当前终端里的临时数据库连接字符串。
9. 在 Vercel 选择 GitHub 仓库导入项目，确认框架是 Vite、Node.js 是 24.x、构建命令是 `npm run build`、安装命令是 `npm ci`。
10. 在 Vercel 填 `DATABASE_URL`、`JWT_SECRET`、`JWT_EXPIRES_IN_SECONDS`、`VITE_API_BASE_URL` 等环境变量，然后点击 Deploy。
11. 部署成功后检查 `/api/health`、`/api/categories`、首页、作者登录、管理员登录。

这条路线里，登录 GitHub、登录 Neon、登录 Vercel、邮箱确认、浏览器授权、复制 Neon 连接字符串、在 Vercel 网页粘贴环境变量，都需要你本人手动做。Codex 可以陪你看每一步、检查命令输出、判断报错和修改代码文档，但不能替你完成网页账号授权。

如果这个项目是从别人那里接手的，建议在第 9 步初始化数据库时设置 `SEED_ADMIN_*` 和 `SEED_AUTHOR_*`，让数据库里创建你自己的管理员和作者账号。否则项目会使用默认演示账号，适合临时验收，但不适合长期继续使用。

## 如果用压缩包交接项目

如果你是原项目持有人，要把项目发给别人，不要手动全选整个工作目录压缩。请在项目根目录执行：

```powershell
npm run package:handoff
```

生成的文件在：

```text
output/blog-handoff.zip
```

把这个 zip 发给接手人即可。它会保留源码、配置模板和正式教程文档，并排除 `.git/`、`node_modules/`、`dist/`、`coverage/`、`.vercel/`、`.playwright-cli/`、`output/`、`.trae/`、`.env`、`.env.local`、`.env.*.local`、`docs/plans/` 和 `docs/superpowers/`。

压缩包里也会带上两份可以单独发给同学的中文短版文档：

```text
docs/给同学的交接文档/01-文件接收入手教程.md
docs/给同学的交接文档/02-后续部署配置教程.md
```

如果接手人刚收到文件，建议先看上面两份短版文档，再回到本文档查具体页面和命令细节。

如果你是接手人，解压后按本文档继续执行即可。首次初始化数据库前，建议设置 `SEED_ADMIN_*` 和 `SEED_AUTHOR_*`，这样数据库里会创建你自己的管理员和作者账号。

## 你不要做的事

很重要，先看这个：

1. 不要把真实 `DATABASE_URL` 提交到 GitHub。
2. 不要把真实 `JWT_SECRET` 提交到 GitHub。
3. 不要把数据库连接字符串写进 README、计划文档、GitHub issue 这类会长期保存的公开文件。
4. 不要创建 `.env` 或 `.env.local` 后提交到 GitHub。当前 `.gitignore` 已经忽略这两个文件，但你仍然要小心。
5. 不要在 GitHub 新仓库页面勾选 README、`.gitignore`、license，因为当前本地项目已经有文件，勾选会制造冲突。
6. 不要把 `.vercel/`、`node_modules/`、`dist/`、`coverage/`、`docs/plans/` 或 `docs/superpowers/` 一起发给别人；直接使用 `npm run package:handoff` 生成交接压缩包。

## 先理解 4 个词

### GitHub

GitHub 就是放代码的网盘。Vercel 需要从 GitHub 读取你的代码，然后自动构建网站。

### Neon

Neon 是在线 PostgreSQL 数据库。你的博客文章、用户、分类、标签会存到这里。

### Vercel

Vercel 是部署平台。它会把前端页面和 `/api` 后端接口一起部署成一个网址。

### 环境变量

环境变量就是不能写死在代码里的配置。比如数据库密码、JWT 登录密钥、网站地址。你会在 Vercel 的网页上填写它们。

当前项目最重要的环境变量是：

```dotenv
DATABASE_URL=<Neon pooled 数据库连接字符串>
JWT_SECRET=<至少 32 位随机字符串>
JWT_EXPIRES_IN_SECONDS=86400
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Blog Platform
VITE_INDEXING_ENABLED=false
VITE_OBSERVABILITY_ENABLED=false
# VITE_OBSERVABILITY_DSN 可省略；只有启用观测时才需要填
# VITE_RELEASE_VERSION 可省略；如果系统环境变量没有自动提供提交号，再填当前提交号或 v1.0.0
```

第一次部署可以先不设置 `VITE_SITE_URL`。项目会优先使用 Vercel 的系统环境变量推导部署网址；等网站成功上线后，再把最终生产网址补进 `VITE_SITE_URL`。

`VITE_RELEASE_VERSION` 通常可以不填，因为项目会在 Vercel 系统环境变量自动暴露开启后使用 `VERCEL_GIT_COMMIT_SHA` 当版本号。如果构建提示缺少版本号，再手动填当前提交号；实在不会取提交号时，第一次部署可以先填 `v1.0.0`。

记住一个简单规则：本地初始化数据库时临时使用 direct 连接字符串；Vercel 网页里的 `DATABASE_URL` 使用 pooled 连接字符串。

## 第 0 步：打开项目终端

1. 打开 VS Code。
2. 点击左上角 `File`。
3. 点击 `Open Folder...`。
4. 在文件夹选择窗口里找到你解压或克隆后的项目目录，例如：

```text
D:\projects\blog
```

5. 点击这个 `blog` 文件夹。
6. 点击 `Select Folder` 或 `选择文件夹`。
7. 等 VS Code 打开项目。
8. 点击顶部菜单 `Terminal`。
9. 点击 `New Terminal`。
10. 底部会出现一个终端窗口，通常是 PowerShell。
11. 如果终端不在项目目录，复制下面命令，粘贴进去，按回车：

```powershell
Set-Location -Path '<项目目录>'
```

12. 输入下面命令，按回车：

```powershell
Get-Location
```

13. 你应该看到类似：

```text
Path
----
D:\projects\blog
```

看到这个才继续。

## 第 1 步：检查本机工具

在 VS Code 终端里逐条输入下面命令。每条输入后按回车。

### 1.1 检查 Node

```powershell
node -v
```

如果看到类似：

```text
v24.x.x
```

就可以继续。本项目已经在 `package.json` 里固定 `engines.node=24.x`，Vercel 部署时也按 Node.js 24.x 运行；本机最好也用 24.x，减少“本地和线上不一样”的问题。

如果提示 `node` 不是命令：

1. 打开浏览器。
2. 访问 `https://nodejs.org/`。
3. 点击下载 LTS 版本；如果页面提供多个版本，选择 Node.js 24.x。
4. 下载完成后双击安装包。
5. 一路点击 `Next`。
6. 安装完成后关闭 VS Code。
7. 重新打开 VS Code 和终端。
8. 再运行：

```powershell
node -v
```

### 1.2 检查 npm

```powershell
npm -v
```

如果出现版本号，比如：

```text
10.x.x
```

就可以。

### 1.3 检查 Git

```powershell
git --version
```

如果出现类似：

```text
git version 2.x.x
```

就可以。

如果提示 `git` 不是命令：

1. 打开浏览器。
2. 访问 `https://git-scm.com/download/win`。
3. 下载 Git for Windows。
4. 双击安装包。
5. 一路点击 `Next`。
6. 安装完成后关闭 VS Code。
7. 重新打开 VS Code 和终端。
8. 再运行：

```powershell
git --version
```

## 第 2 步：查看有没有未提交代码

在 VS Code 终端输入：

```powershell
git status --short
```

理想情况：什么都不输出。

如果什么都不输出，说明没有未提交的代码改动，可以继续。

如果输出了文件名，不一定是坏事。比如 Codex 刚帮你改完部署代码和教程，终端就会显示很多 `M` 或 `??` 开头的文件，这表示“这些改动还没有提交到 Git”。

只要输出里没有 `.env`、`.env.local`、数据库连接字符串文件、密码文件，就可以继续第 3 步。第 3 步验证通过后，再按第 3.5 步提交这些改动。

如果你看不懂输出，或者看到 `.env`、`.env.local` 出现在列表里，先停下来，把 `git status --short` 的输出发给 Codex 看。

## 第 3 步：本地跑一次完整检查

在 VS Code 终端输入：

```powershell
npm ci
```

等它跑完。这个命令会严格按照 `package-lock.json` 安装依赖，和 Vercel 的安装方式一致。如果出现 `npm audit` 提示但命令最后是成功结束，可以继续；如果出现红色 `npm ERR!`，先停下来把错误发给 Codex。

然后输入：

```powershell
npm run verify
```

这个命令会跑：

- 代码规范检查
- 前端测试
- 后端测试
- smoke 测试
- 生产构建

成功时会看到很多输出，最后会有类似：

```text
✓ built
```

如果失败，把终端最后 30 行复制给排查的人。涉及 `DATABASE_URL`、`JWT_SECRET`、数据库密码或访问令牌时先打码；确实临时暴露真实值后，要尽快重新生成并替换对应密钥。

说明：`test:unit`、`test:backend` 和 `test:smoke` 使用不同的 coverage 输出目录，分别是 `coverage/unit`、`coverage/backend` 和 `coverage/smoke`。正常按 `npm run verify` 串行执行即可；如果你在多个终端同时运行这些测试，也不会互相删除 coverage 临时目录。

## 第 3.5 步：提交本次代码改动

这一步的作用是把当前已经验证通过的代码保存成一个 Git 提交。Vercel 只能部署 GitHub 上的代码；如果本地改动没有提交和推送，Vercel 看不到它们。

先输入：

```powershell
git status --short
```

如果什么都不输出，说明当前没有需要提交的内容，可以跳到第 4 步。

如果能看到文件列表，先确认里面没有 `.env` 或 `.env.local`。然后输入：

```powershell
git add .
git commit -m "Prepare final deployment"
```

如果 `git commit` 提示类似 `nothing to commit`，说明刚才没有新的可提交内容，可以继续。

如果 `git commit` 提示类似 `Please tell me who you are` 或 `Author identity unknown`，说明这台电脑还没有设置 Git 提交身份。输入下面两条命令，把邮箱和名字换成你自己的 GitHub 邮箱和用户名：

```powershell
git config --global user.email "你的邮箱@example.com"
git config --global user.name "你的GitHub用户名"
```

然后重新执行：

```powershell
git commit -m "Prepare final deployment"
```

## 第 4 步：确认有没有 GitHub 远程仓库

在 VS Code 终端输入：

```powershell
git remote -v
```

如果什么都不输出，说明这个项目还没有连到 GitHub，需要继续第 5 步。

如果输出类似：

```text
origin  https://github.com/你的用户名/某个仓库.git (fetch)
origin  https://github.com/你的用户名/某个仓库.git (push)
```

说明已经有远程仓库，可以跳到第 6 步。接手项目时不要沿用别人的 GitHub 远程仓库；如果这里显示的是原作者的仓库地址，请先让原作者把仓库转给你，或在第 5 步创建自己的仓库后把 `origin` 改成你的仓库地址。

## 第 5 步：创建 GitHub 仓库并上传代码

只有在第 4 步没有任何输出时才做这一步。

### 5.1 打开 GitHub

1. 打开浏览器。
2. 访问 `https://github.com/`。
3. 如果没有登录，点击右上角 `Sign in`。
4. 输入你的邮箱或用户名。
5. 输入密码。
6. 点击 `Sign in`。

### 5.2 创建新仓库

1. 登录后，看页面右上角。
2. 点击右上角的 `+` 号。
3. 点击 `New repository`。
4. 找到 `Repository name` 输入框。
5. 输入：

```text
blog
```

6. `Description` 可以留空，也可以输入：

```text
Full-stack blog platform
```

7. `Public` 和 `Private` 二选一：
   - 如果作业需要老师能访问代码，选择 `Public`。
   - 如果只是自己部署，可以选择 `Private`。
8. 不要勾选 `Add a README file`。
9. 不要选择 `.gitignore`。
10. 不要选择 `license`。
11. 点击绿色按钮 `Create repository`。

### 5.3 复制仓库地址

创建后，你会进入新仓库页面。

1. 找到页面上类似 `Quick setup` 的区域。
2. 找到 HTTPS 地址，形如：

```text
https://github.com/你的用户名/blog.git
```

3. 点击地址右边的复制按钮。

### 5.4 把本地项目连接到 GitHub

回到 VS Code 终端。

输入下面命令，但把 URL 换成你刚才复制的地址：

```powershell
git remote add origin https://github.com/你的用户名/blog.git
```

例如，如果你的 GitHub 用户名是 `your-name`，命令可能是：

```powershell
git remote add origin https://github.com/your-name/blog.git
```

然后输入：

```powershell
git push -u origin master
```

如果你已经把本地分支改成了 `main`，就执行：

```powershell
git push -u origin main
```

如果弹出 GitHub 登录窗口：

1. 点击 `Sign in with your browser`。
2. 浏览器打开后登录 GitHub。
3. 如果看到授权页面，点击 `Authorize`。
4. 回到 VS Code 等待命令完成。

成功时通常会看到类似输出。使用 `master` 时可能是：

```text
branch 'master' set up to track 'origin/master'
```

使用 `main` 时会显示 `main` 和 `origin/main`，也是正常的。

## 第 6 步：确认代码已经在 GitHub 上

如果第 4 步已经显示有 `origin` 远程仓库，先在 VS Code 终端输入：

```powershell
git push
```

如果提示当前分支没有 upstream，就按你的当前分支选择命令。当前本地分支是 `master` 时执行：

```powershell
git push -u origin master
```

如果你已经改用 `main`，执行：

```powershell
git push -u origin main
```

然后再检查 GitHub 页面：

1. 回到浏览器里的 GitHub 仓库页面。
2. 刷新页面。
3. 你应该能看到这些文件或文件夹：
   - `api`
   - `src`
   - `docs`
   - `package.json`
   - `vercel.json`
4. 如果看不到，回到 VS Code 终端再运行一次：

```powershell
git push
```

5. 再刷新 GitHub 页面。

## 第 7 步：创建 Neon 数据库

### 7.1 打开 Neon

1. 打开浏览器新标签页。
2. 访问 `https://console.neon.tech/`。
3. 如果没有账号，点击 `Sign up`。
4. 推荐选择 `Continue with GitHub`。
5. 按网页提示授权登录。

### 7.2 创建项目

1. 登录 Neon 后，找页面上的 `New Project` 或 `Create Project` 按钮。
2. 点击它。
3. 找到 `Project name` 输入框。
4. 输入：

```text
blog
```

5. 如果看到 `Postgres version`，保持默认。
6. 如果看到 `Region`，选择离你近的地区。
   - 如果有 `Singapore` 或 `Asia Pacific`，可以选它。
   - 如果没有，保持默认也可以。
7. 如果看到 `Database name`，可以保持默认 `neondb`。
8. 点击 `Create Project`。

### 7.3 复制数据库连接字符串

1. 创建完成后，你会进入 Neon 项目 Dashboard。
2. 找到并点击 `Connect` 按钮。
3. 如果弹出 `Connection Details` 窗口：
   - `Branch` 选择默认的 `main` 或 `production`。
   - `Database` 选择默认的 `neondb`。
   - `Role` 选择默认角色，通常是 `neondb_owner`。
4. 先复制 direct 连接字符串：
   - 如果看到 `Connection pooling` 或 `Pooled connection`，先关闭它。
   - 找到连接字符串，点击复制。
   - 在本地临时记事本里标记为：`本地迁移和种子数据用`。
5. 再复制 pooled 连接字符串：
   - 回到同一个 `Connect` 窗口。
   - 开启 `Connection pooling` 或选择 `Pooled connection`。
   - 再复制一次连接字符串。
   - 在本地临时记事本里标记为：`Vercel DATABASE_URL 用`。
6. 连接字符串形状类似：

```text
postgresql://用户名:密码@某个地址.neon.tech/neondb?sslmode=require
```

如果是 pooled，地址里通常会带 `-pooler`。如果是 direct，地址里通常不带 `-pooler`。

7. 不要把它们提交到 GitHub。
8. 不要把它们发到公开聊天。

说明：

- Vercel 里的 `DATABASE_URL` 推荐使用 pooled 连接字符串，也就是地址里通常带 `-pooler` 的那条。
- 后面本地执行 `npm run db:migrate` 和 `npm run db:seed` 时，优先使用 direct 连接字符串，也就是地址里通常不带 `-pooler` 的那条。
- 如果你只复制了 pooled 连接字符串，也可以先继续；一旦迁移时出现 connection pool、pooler 或 prepared statement 相关错误，就回到 Neon 的 `Connect` 窗口，关闭 `Connection pooling`，复制 direct 连接字符串后重试。
- 跑完迁移和种子数据后，Vercel 里的 `DATABASE_URL` 仍然填 pooled 连接字符串。

## 第 8 步：生成 JWT_SECRET

JWT_SECRET 是后端用来签发登录 token 的密钥。你不需要理解算法，只要生成一个足够长的随机字符串。

回到 VS Code 终端，输入：

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

按回车后，会输出一长串字符，类似：

```text
9c2f1a0d0b4e7f3a8b...
```

复制这一整串，临时保存到本地记事本。后面要填到 Vercel 的 `JWT_SECRET`。

注意：

- 不要用文档里的示例。
- 不要用 `123456`。
- 不要用 `replace-with-at-least-32-characters`。

## 第 9 步：初始化数据库表和演示数据

这一步会把当前项目需要的数据表建到 Neon，并创建初始登录账号、演示文章、分类和标签。

### 9.1 在当前 PowerShell 里设置 DATABASE_URL

回到 VS Code 终端。

输入下面命令，但把双引号里的内容换成你从 Neon 复制的 direct 连接字符串：

```powershell
$env:DATABASE_URL = "postgresql://你的真实连接字符串"
```

例如：

```powershell
$env:DATABASE_URL = "postgresql://neondb_owner:xxxxx@ep-xxxxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require"
```

这个命令只在当前终端窗口有效。你关闭终端后它会消失，这是好事。

### 9.2 可选：设置自己的初始登录账号

如果你不想使用默认演示账号，可以在执行 `db:seed` 前设置自己的管理员和作者账号。推荐接手项目的人在第一次初始化数据库时就设置这些变量。

```powershell
$env:SEED_ADMIN_USERNAME = "your_admin"
$env:SEED_ADMIN_EMAIL = "your-admin@example.com"
$env:SEED_ADMIN_PASSWORD = "YourAdminPassword123!"
$env:SEED_ADMIN_NICKNAME = "管理员"
$env:SEED_AUTHOR_USERNAME = "your_author"
$env:SEED_AUTHOR_EMAIL = "your-author@example.com"
$env:SEED_AUTHOR_PASSWORD = "YourAuthorPassword123!"
$env:SEED_AUTHOR_NICKNAME = "作者"
```

把 `your_admin`、邮箱和密码换成你自己的值。密码不要用上面的示例，也不要用 `123456`。

如果你跳过这一步，`db:seed` 会使用默认演示账号：

```text
作者：author_demo / Author123456!
管理员：admin / Admin123456!
```

### 9.3 执行数据库迁移

输入：

```powershell
npm run db:migrate
```

成功时应该看到：

```text
Database migration complete
```

如果失败：

1. 检查 `DATABASE_URL` 有没有复制完整。
2. 检查字符串两边有没有英文双引号。
3. 检查 Neon 项目是否还在。
4. 把错误最后 20 行发给排查的人。涉及 `postgresql://...` 这类连接字符串时先打码；确实临时暴露真实连接字符串后，要在 Neon 重新生成数据库密码并更新环境变量。

### 9.4 写入演示数据

输入：

```powershell
npm run db:seed
```

成功时应该看到：

```text
Database seed complete
```

成功后，数据库里会有：

- 你通过 `SEED_AUTHOR_*` 设置的作者账号；如果没设置，默认是 `author_demo / Author123456!`
- 你通过 `SEED_ADMIN_*` 设置的管理员账号；如果没设置，默认是 `admin / Admin123456!`
- 一批演示文章、分类、标签

### 9.5 清掉当前终端里的临时环境变量

输入：

```powershell
Remove-Item Env:\DATABASE_URL
```

如果你在 9.2 设置过 `SEED_*` 变量，也建议继续输入下面命令清掉：

```powershell
Remove-Item Env:\SEED_ADMIN_USERNAME, Env:\SEED_ADMIN_EMAIL, Env:\SEED_ADMIN_PASSWORD, Env:\SEED_ADMIN_NICKNAME, Env:\SEED_AUTHOR_USERNAME, Env:\SEED_AUTHOR_EMAIL, Env:\SEED_AUTHOR_PASSWORD, Env:\SEED_AUTHOR_NICKNAME -ErrorAction SilentlyContinue
```

这些命令不会删除 Neon 数据库，只是把当前 PowerShell 里临时保存的连接字符串和初始化账号配置清掉。后面 Vercel 仍然要在网页环境变量里填写 pooled 连接字符串。

## 第 10 步：把项目导入 Vercel

### 10.1 打开 Vercel

1. 打开浏览器新标签页。
2. 访问 `https://vercel.com/`。
3. 点击右上角 `Log In`。
4. 推荐选择 `Continue with GitHub`。
5. 如果浏览器问是否授权，点击同意或 authorize。

### 10.2 新建 Vercel 项目

1. 登录后进入 Vercel Dashboard。
2. 找到右上角 `Add New...` 或 `New Project`。
3. 点击它。
4. 页面会显示你的 GitHub 仓库列表。
5. 找到 `blog`。
6. 如果看不到仓库：
   - 点击 `Adjust GitHub App Permissions` 或类似按钮。
   - 跳到 GitHub 授权页面。
   - 选择你的 GitHub 账号。
   - 选择 `Only select repositories`。
   - 勾选 `blog`。
   - 点击 `Install` 或 `Save`。
   - 回到 Vercel 页面刷新。
7. 在 `blog` 右边点击 `Import`。

### 10.3 检查项目配置

进入 `Configure Project` 页面后，逐项确认。

如果页面显示 `Project Name`：

```text
blog
```

如果页面显示 `Framework Preset`，选择或确认：

```text
Vite
```

如果页面显示 `Root Directory`：

```text
./
```

如果页面显示 `Build Command`：

```text
npm run build
```

如果页面显示 `Output Directory`：

```text
dist
```

如果页面显示 `Install Command`：

```text
npm ci
```

说明：当前项目已经有 `vercel.json`，Vercel 通常会自动读取这些值。你只需要确认它们没有变成别的。

再找页面里是否有 `Node.js Version` 或类似选项。

如果看到了这个选项：

1. 选择 `24.x`。
2. 不要选 `18.x`、`20.x` 或 `22.x`。
3. 如果页面没有这个选项，也不用手动添加；项目的 `package.json` 已经写了 `engines.node=24.x`，Vercel 会按这个要求构建和运行。

### 10.4 在 Vercel 填环境变量

在 `Configure Project` 页面往下找 `Environment Variables`。

先找页面上有没有类似 `Automatically expose System Environment Variables` 的开关。

如果看到了这个开关：

1. 把它打开。
2. 这样项目就能读取 `VERCEL_ENV`、`VERCEL_URL`、`VERCEL_PROJECT_PRODUCTION_URL`、`VERCEL_GIT_COMMIT_SHA`。
3. 这些变量会帮助项目自动区分 Preview/Production、自动生成站点 URL、自动拿到当前 Git 提交号。

如果导入项目页面没看到这个开关，也不要卡住。先继续填下面的环境变量；项目创建后还能在 `Settings` -> `Environment Variables` 里确认。

你要逐个添加下面这些变量。每添加一个，都按这个流程：

1. 点击 `Add` 或找到 `Name` 输入框。
2. 在 `Name` 输入变量名。
3. 在 `Value` 输入变量值。
4. 如果有环境选择，先勾选 `Production`、`Preview`、`Development` 三个；后面专门说明的变量除外。
5. 点击 `Add` 或 `Save`。

#### 变量 1：DATABASE_URL

Name 输入：

```text
DATABASE_URL
```

Value 输入你从 Neon 复制的 pooled 连接字符串，通常地址里带 `-pooler`。这条是给 Vercel 线上接口用的。

#### 变量 2：JWT_SECRET

Name 输入：

```text
JWT_SECRET
```

Value 输入第 8 步生成的随机字符串。

#### 变量 3：JWT_EXPIRES_IN_SECONDS

Name 输入：

```text
JWT_EXPIRES_IN_SECONDS
```

Value 输入：

```text
86400
```

#### 变量 4：VITE_API_BASE_URL

Name 输入：

```text
VITE_API_BASE_URL
```

Value 输入：

```text
/api
```

这表示前端访问同一个 Vercel 网站下面的后端接口。

#### 变量 5：VITE_APP_TITLE

Name 输入：

```text
VITE_APP_TITLE
```

Value 输入：

```text
Blog Platform
```

#### 变量 6：VITE_INDEXING_ENABLED

Name 输入：

```text
VITE_INDEXING_ENABLED
```

Value 输入：

```text
false
```

第一次部署先用 `false`，避免搜索引擎收录测试站。

#### 变量 7：VITE_OBSERVABILITY_ENABLED

Name 输入：

```text
VITE_OBSERVABILITY_ENABLED
```

Value 输入：

```text
false
```

#### 变量 8：VITE_OBSERVABILITY_DSN

Name 输入：

```text
VITE_OBSERVABILITY_DSN
```

Value 留空。

如果 Vercel 不允许留空，可以先不添加这个变量。只有以后你真的接入错误监控平台，并且把 `VITE_OBSERVABILITY_ENABLED` 改成 `true` 时，才需要回来填写 DSN。

#### 变量 9：VITE_RELEASE_VERSION

如果第 10.4 开头的系统环境变量自动暴露已经打开，这个变量可以不添加，项目会自动使用当前 Git 提交号。

如果你不确定那个开关有没有打开，就手动添加这个变量：

Name 输入：

```text
VITE_RELEASE_VERSION
```

Value 输入当前提交号。回到 VS Code 终端，执行：

```powershell
git rev-parse --short HEAD
```

把输出复制到 Vercel 的 Value 里。实在不会取提交号时，第一次部署也可以先填：

```text
v1.0.0
```

暂时不要添加 `VITE_SITE_URL`。第一次部署先让 Vercel 自动使用部署网址。

### 10.5 点击 Deploy

1. 确认环境变量都填完。
2. 点击页面底部或右侧的 `Deploy`。
3. 等待 Vercel 构建。
4. 你会看到构建日志滚动。
5. 成功时页面会显示类似 `Congratulations!` 或 `Your project has been deployed`。
6. 点击 `Continue to Dashboard` 或 `Visit`。
7. 进入项目后，打开 `Settings` -> `Environment Variables`。
8. 再确认一次 `Automatically expose System Environment Variables` 已经打开。
9. 如果你刚刚才打开这个开关，去 `Deployments` 对最新部署执行一次 `Redeploy`。

## 第 11 步：如果 Vercel 构建失败

先不要乱改代码。按错误信息判断。

### 11.1 如果看到 VITE_RELEASE_VERSION 相关错误

可能的错误：

```text
VITE_RELEASE_VERSION must be a commit SHA, build number, or semantic version
```

解决：

1. 回到 Vercel 项目。
2. 点击 `Settings`。
3. 点击 `Environment Variables`。
4. 先确认 `Automatically expose System Environment Variables` 已经打开。
5. 如果已经打开，去 `Deployments` 重新部署一次。
6. 如果还是失败，就添加 `VITE_RELEASE_VERSION`。
7. Value 填当前提交号。不会取提交号时，第一次可以先填：

```text
v1.0.0
```

8. 不要填 `local`、`dev`、`test` 或 `production`，这些不是有效的线上发布版本。
9. 保存。
10. 去 `Deployments`。
11. 找到失败的那次部署。
12. 点击右边三个点 `...`。
13. 点击 `Redeploy`。

### 11.2 如果看到 VITE_SITE_URL 相关错误

可能的错误：

```text
VITE_SITE_URL must point to the real frontend origin
```

解决：

1. 去 Vercel 项目 `Settings`。
2. 点击 `Environment Variables`。
3. 找到 `VITE_SITE_URL`。
4. 如果它的值是 `https://blog.production.invalid`，删除这个变量。
5. 保存。
6. 重新部署。

第一次部署通常不需要手动填 `VITE_SITE_URL`。如果系统环境变量自动暴露没有打开，或者你的部署环境拿不到 `VERCEL_URL`，就先填一个真实的 `https://` 域名，例如 Vercel 分配给项目的域名，然后重新部署。

### 11.3 如果看到 DATABASE_URL 或 JWT_SECRET 相关错误

构建阶段通常不需要连数据库，但运行 API 时需要。如果构建日志里直接报这些变量：

1. 去 Vercel 项目 `Settings`。
2. 点击 `Environment Variables`。
3. 确认有 `DATABASE_URL`。
4. 确认有 `JWT_SECRET`。
5. 确认这两个变量都勾选了 `Production` 和 `Preview`。
6. 保存后重新部署。

### 11.4 如果本地运行 Vercel CLI 提示 token 无效

这一步只影响你在电脑上用命令行做 Vercel 预检查，不影响你在 Vercel 网页里导入 GitHub 仓库部署。

如果你或 Codex 在 VS Code 终端里运行 `vercel build`、`vercel pull`、`vercel deploy` 时看到：

```text
The specified token is not valid. Use `vercel login` to generate a new token.
```

按下面做：

1. 回到 VS Code 终端。
2. 输入：

```powershell
npx vercel@latest logout
```

3. 再输入：

```powershell
npx vercel@latest login
```

4. 终端会提示你输入邮箱，输入你注册 Vercel 的邮箱。
5. 打开邮箱，找到 Vercel 发来的登录邮件。
6. 点击邮件里的登录按钮或确认链接。
7. 回到 VS Code 终端，等待它显示登录成功。
8. 再重新运行原来的 Vercel CLI 命令。

如果你只是按本文档用 Vercel 网页部署，可以暂时跳过 Vercel CLI。网页部署不需要你在本机登录 Vercel CLI。

### 11.5 如果 Vercel CLI 提示 project_not_found

如果你或 Codex 在终端运行类似下面的命令：

```powershell
npx vercel build --prod --yes --project blog
```

看到：

```text
Project "blog" was not found
project_not_found
```

这通常不是代码坏了，而是当前登录的 Vercel 账号或团队下面还没有导入这个项目。

按下面做：

1. 打开 Vercel Dashboard。
2. 确认右上角当前账号或团队是不是你要交作业用的账号。
3. 如果还没有项目，回到第 10 步，点击 `Add New Project`，从 GitHub 导入 `blog` 仓库。
4. 如果项目在另一个团队，切到那个团队后再试。
5. 如果你想继续用 CLI，先列出可用团队：

```powershell
npx vercel teams ls
```

6. 然后带上正确的 scope 重新运行，例如：

```powershell
npx vercel build --prod --yes --project blog --scope 你的团队或账号名
```

如果你只是用 Vercel 网页导入和部署，可以不用管这个 CLI 报错。网页里项目创建成功、环境变量填好、Deploy 成功，才是课程作业真正需要的结果。

## 第 12 步：线上功能验收

部署成功后，你会得到一个网址，形如：

```text
https://blog-xxxx.vercel.app
```

下面用 `<你的网址>` 表示它。

### 12.1 检查健康接口

1. 打开浏览器地址栏。
2. 输入：

```text
<你的网址>/api/health
```

例如：

```text
https://blog-xxxx.vercel.app/api/health
```

3. 按回车。
4. 你应该看到类似：

```json
{"code":0,"message":"ok","data":{"status":"ok"}}
```

只要看到 `"code":0` 就是好信号。

### 12.2 检查分类接口

地址栏输入：

```text
<你的网址>/api/categories
```

应该看到 JSON，并且包含 `"code":0`。

如果这里报数据库未配置，说明 Vercel 的 `DATABASE_URL` 没填对。

### 12.3 检查首页

1. 地址栏输入：

```text
<你的网址>
```

2. 按回车。
3. 首页应该打开。
4. 页面应该能看到文章列表。
5. 尝试点击分类或标签。
6. 尝试搜索关键词。

### 12.4 检查公开文章详情

1. 在首页点击一篇文章。
2. 文章详情应该打开。
3. Markdown 正文应该正常显示。
4. 如果页面有上一篇/下一篇链接，点击确认能跳转。

### 12.5 检查静态部署文件

这些地址是给浏览器、搜索引擎或站点图标用的，不需要登录。

1. 打开：

```text
<你的网址>/robots.txt
```

如果课程作业按本文档设置了 `VITE_INDEXING_ENABLED=false`，应该能看到 `Disallow: /`。

2. 打开：

```text
<你的网址>/sitemap.xml
```

应该看到 XML 文本，里面的网址应该是你的 Vercel 生产网址。

3. 打开：

```text
<你的网址>/site.webmanifest
```

应该看到 JSON 文本。如果你看到的是博客首页，说明静态文件没有按预期返回。

### 12.6 检查作者登录

1. 地址栏输入：

```text
<你的网址>/login
```

2. 输入 `db:seed` 创建的作者账号。如果第 9.2 步设置过 `SEED_AUTHOR_USERNAME`，就输入你设置的值；如果没有设置，默认输入：

```text
author_demo
```

3. 输入对应作者密码。如果第 9.2 步设置过 `SEED_AUTHOR_PASSWORD`，就输入你设置的值；如果没有设置，默认输入：

```text
Author123456!
```

4. 点击登录按钮。
5. 成功后应该进入作者区域。

### 12.7 检查作者发文

1. 进入作者区域后，找到文章管理。
2. 点击新建文章。
3. 等页面里的分类和标签选项加载出来。如果标签暂时没有出现，可以先不选标签；分类必须至少选一个。
4. 标题输入：

```text
我的第一篇线上测试文章
```

5. 摘要可以留空；如果想填，可以输入：

```text
这是一篇部署验收用的测试文章。
```

6. 封面 URL 可以留空。
7. 选择至少一个分类。
8. 标签是可选项；如果页面里能看到标签，可以选一个或多个，不选也可以发布。
9. 正文输入：

```markdown
# 我的第一篇线上测试文章

这是一篇部署验收用的测试文章。
```

10. 点击保存草稿。
11. 如果草稿保存成功，再点击发布文章。
12. 回到首页，看文章是否出现。

### 12.8 检查管理员登录

1. 地址栏输入：

```text
<你的网址>/admin/login
```

2. 输入 `db:seed` 创建的管理员账号。如果第 9.2 步设置过 `SEED_ADMIN_USERNAME`，就输入你设置的值；如果没有设置，默认输入：

```text
admin
```

3. 输入对应管理员密码。如果第 9.2 步设置过 `SEED_ADMIN_PASSWORD`，就输入你设置的值；如果没有设置，默认输入：

```text
Admin123456!
```

4. 点击登录。
5. 成功后应该进入管理员后台。

### 12.9 检查管理员功能

按顺序点一遍：

1. 点击文章管理。
2. 确认能看到文章列表。
3. 点进一篇文章详情。
4. 尝试编辑文章标题。
5. 点击分类管理。
6. 新建一个分类，名称输入：

```text
线上测试分类
```

7. 点击标签管理。
8. 新建一个标签，名称输入：

```text
线上测试标签
```

9. 点击用户管理。
10. 确认能看到作者账号。如果第 9.2 步设置过 `SEED_AUTHOR_USERNAME`，这里应看到你设置的作者用户名；如果没有设置，默认是 `author_demo`。
11. 点进用户详情。
12. 尝试禁用再启用作者。

## 第 13 步：补充正式站点 URL

第一次部署成功后，可以把真实网址写进 Vercel 环境变量。

1. 打开 Vercel Dashboard。
2. 点击你的 `blog` 项目。
3. 点击 `Settings`。
4. 点击 `Environment Variables`。
5. 点击添加变量。
6. Name 输入：

```text
VITE_SITE_URL
```

7. Value 输入你的 Vercel 网址，例如：

```text
https://blog-xxxx.vercel.app
```

8. 环境只选择 `Production`。
9. 点击 `Save`。
10. 去 `Deployments`。
11. 点击最新部署右边的三个点 `...`。
12. 点击 `Redeploy`。

如果你希望正式站点被搜索引擎收录，还要把 `VITE_INDEXING_ENABLED` 的 Production 值改成：

```text
true
```

Preview 环境必须继续保持 `false`，不要改成 `true`。

如果你后面绑定自己的域名，再把 Production 的 `VITE_SITE_URL` 改成自己的正式域名，并重新部署一次。

## 第 14 步：每次我改完代码后你怎么更新线上网站

如果后续 Codex 又改了代码，并且提交已经完成，你需要：

1. 打开 VS Code 终端。
2. 确认在项目目录：

```powershell
Set-Location -Path '<项目目录>'
```

3. 输入：

```powershell
git status --short
```

4. 如果没有输出，继续。
5. 输入：

```powershell
git push
```

6. 等命令结束。
7. 打开 Vercel Dashboard。
8. 点击项目。
9. 点击 `Deployments`。
10. 等新的部署完成。

Vercel 会在你 push 到生产分支后自动部署。当前本地分支是 `master`；如果你改用 `main`，Vercel 的 Production Branch 也要改成 `main`。

## 常见问题

### 问题 1：`git push` 要我登录

按提示登录 GitHub。通常会弹出浏览器：

1. 点击 `Sign in with browser`。
2. 浏览器里登录 GitHub。
3. 点击授权。
4. 回到终端等待。

### 问题 2：`git commit` 提示 Author identity unknown

这是 Git 第一次在你电脑上提交代码时常见的问题。设置一次就行：

```powershell
git config --global user.email "你的邮箱@example.com"
git config --global user.name "你的GitHub用户名"
```

设置后重新运行：

```powershell
git commit -m "Prepare final deployment"
```

### 问题 3：Vercel 找不到 GitHub 仓库

处理：

1. 回到 Vercel 导入项目页面。
2. 点击 GitHub 权限设置。
3. 选择你的 GitHub 账号。
4. 选择 `Only select repositories`。
5. 勾选 `blog`。
6. 保存。
7. 回 Vercel 刷新。

### 问题 4：`/api/categories` 报错

最常见原因是 `DATABASE_URL` 没填对。

检查：

1. Vercel 项目。
2. `Settings`。
3. `Environment Variables`。
4. 确认 `DATABASE_URL` 是 Neon 的完整连接字符串。
5. 确认选择了 `Production` 和 `Preview`。
6. 保存后重新部署。

### 问题 5：登录失败，但首页能打开

检查：

1. 是否已经运行过：

```powershell
npm run db:migrate
npm run db:seed
```

2. 是否用的是 `db:seed` 创建的正确账号。如果第 9.2 步设置过 `SEED_*`，请使用自己设置的账号；如果没设置，默认是：

```text
author_demo / Author123456!
admin / Admin123456!
```

3. Vercel 里是否配置了 `JWT_SECRET`。
4. 修改环境变量后是否重新部署。

### 问题 6：刷新 `/admin/articles` 后 404

这通常是 Vercel 前端路由回退没生效。当前项目的 `vercel.json` 已配置：

```json
{
  "source": "/((?!api/).*)",
  "destination": "/index.html"
}
```

如果仍然 404：

1. 确认 GitHub 上有 `vercel.json`。
2. 确认 Vercel 部署使用的是这个仓库的最新提交。
3. 重新部署。

补充说明：Vercel 会先返回真实存在的静态文件，再执行上面的 rewrite。因此 `/robots.txt`、`/sitemap.xml`、`/site.webmanifest` 这几个文件不会因为这个 SPA 回退规则变成首页 HTML。如果它们打开后变成首页，优先检查构建产物和 Vercel 部署是否使用了最新提交。

### 问题 7：我不知道该把什么发给 Codex

可以发：

- Vercel 部署失败日志的最后 30 行
- 浏览器地址栏里的 Vercel 网址
- `/api/health` 的返回内容
- `/api/categories` 的返回内容
- 你卡住的页面截图
- 如果怀疑是 `DATABASE_URL`、`JWT_SECRET` 或 Neon 配置问题，优先发送打码后的值、完整错误和截图；确实临时暴露真实值后，要重新生成并替换对应密钥。

## 最终完成标准

全部完成时，你应该有：

1. GitHub 上能看到代码。
2. Neon 里有一个 `blog` 数据库项目。
3. 本地执行过：

```powershell
npm run db:migrate
npm run db:seed
```

4. Vercel 有一个部署成功的 `blog` 项目。
5. Vercel 项目已经开启系统环境变量自动暴露。
6. Production 的 `VITE_SITE_URL` 是最终生产网址，Preview 的 `VITE_INDEXING_ENABLED` 仍然是 `false`。
7. `<你的网址>/api/health` 返回 `"code":0`。
8. 首页能看到文章。
9. 作者账号能登录并发文。
10. 管理员账号能登录并管理文章、分类、标签、用户。

做到这里，就可以说：这个项目已经完成从代码到线上可访问的全栈部署。
