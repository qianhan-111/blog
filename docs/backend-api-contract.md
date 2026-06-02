# 后端 API 合约

本文档描述当前博客系统在 Vercel Functions 下暴露的后端接口。前端默认使用同源 API：

```dotenv
VITE_API_BASE_URL=/api
```

这表示前端访问 `https://your-site.vercel.app/api/...`，后端函数和前端在同一个 Vercel 项目里部署。

## 必需环境变量

后端运行至少需要：

```dotenv
DATABASE_URL=<Neon or PostgreSQL connection string>
JWT_SECRET=<at least 32 random characters>
JWT_EXPIRES_IN_SECONDS=86400
```

前端部署至少需要：

```dotenv
VITE_API_BASE_URL=/api
VITE_APP_TITLE=Blog Platform
VITE_SITE_URL=<production frontend URL; Preview or first Production deploy can omit this when Vercel system env vars are exposed>
VITE_INDEXING_ENABLED=false
VITE_OBSERVABILITY_ENABLED=false
VITE_OBSERVABILITY_DSN=<only required when observability is enabled>
VITE_RELEASE_VERSION=<commit SHA or release version; can be omitted when VERCEL_GIT_COMMIT_SHA is exposed>
```

Preview 环境必须保持 `VITE_INDEXING_ENABLED=false`。Production 环境可以按发布目标设为 `true`。
如果 `VITE_OBSERVABILITY_ENABLED=false`，可以不在 Vercel 添加 `VITE_OBSERVABILITY_DSN`。

## 演示账号

运行种子数据后默认可使用：

| 角色 | 账号 | 密码 |
| --- | --- | --- |
| 作者 | `author_demo` | `Author123456!` |
| 管理员 | `admin` | `Admin123456!` |

接手人可以在执行 `npm run db:seed` 前通过环境变量覆盖这些账号：

```dotenv
SEED_ADMIN_USERNAME=<管理员用户名>
SEED_ADMIN_EMAIL=<管理员邮箱>
SEED_ADMIN_PASSWORD=<管理员密码>
SEED_ADMIN_NICKNAME=<管理员昵称>
SEED_AUTHOR_USERNAME=<作者用户名>
SEED_AUTHOR_EMAIL=<作者邮箱>
SEED_AUTHOR_PASSWORD=<作者密码>
SEED_AUTHOR_NICKNAME=<作者昵称>
```

如果设置了这些变量，登录验收应使用接手人自己的账号；没有设置时才使用上表的默认演示账号。

## 响应格式

所有接口统一返回 JSON：

```json
{
  "code": 0,
  "message": "ok",
  "data": {}
}
```

成功时 `code` 为 `0`。失败时 `code` 通常等于 HTTP 状态码，`data` 为 `null`。

## 鉴权行为

登录和注册接口会返回：

```json
{
  "token": "<jwt>",
  "expiresAt": "2026-05-18T00:00:00.000Z"
}
```

受保护接口需要请求头：

```http
Authorization: Bearer <jwt>
```

作者接口要求 `author` 角色，管理员接口要求 `admin` 角色。token 缺失、过期、角色不匹配或用户被禁用时会返回对应错误。

## 分页格式

分页列表返回：

```json
{
  "items": [],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

常用分页查询参数：

- `page`: 正整数，默认 `1`
- `pageSize`: 正整数，最大 `50`，默认 `20`

## 端点表

| 方法 | 路径 | 鉴权 | 用途 | 参数或请求体 |
| --- | --- | --- | --- | --- |
| `GET` | `/api/health` | 无 | 健康检查 | 无 |
| `GET` | `/api/categories` | 无 | 公开分类列表 | 无 |
| `GET` | `/api/tags` | 无 | 公开标签列表 | 无 |
| `GET` | `/api/articles` | 无 | 公开文章列表 | `page`, `pageSize`, `keyword`, `categoryIds`, `tagIds`, `sortField`, `sortOrder` |
| `GET` | `/api/articles/:id` | 无 | 公开文章详情 | 路径 `id` |
| `GET` | `/api/articles/:id/prev-next` | 无 | 公开文章上一篇/下一篇 | 路径 `id` |
| `GET` | `/api/authors/:id` | 无 | 公开作者资料 | 路径 `id` |
| `GET` | `/api/authors/:id/articles` | 无 | 指定作者公开文章 | 路径 `id`，分页和文章筛选参数 |
| `POST` | `/api/auth/register` | 无 | 作者注册 | `username`, `email`, `password`, `confirmPassword` |
| `POST` | `/api/auth/login` | 无 | 作者登录 | `account`, `password` |
| `POST` | `/api/auth/logout` | 无 | 作者退出 | 无 |
| `GET` | `/api/auth/profile` | 作者 | 获取作者个人资料 | Bearer token |
| `PUT` | `/api/auth/profile` | 作者 | 更新作者个人资料 | `nickname`, `avatarUrl`, `bio` |
| `GET` | `/api/author/articles` | 作者 | 作者文章列表 | 分页、文章筛选参数、`status` |
| `POST` | `/api/author/articles` | 作者 | 作者创建文章 | `status`, `title`, `summary`, `coverUrl`, `contentMarkdown`, `categoryIds`, `tagIds` |
| `GET` | `/api/author/articles/:id` | 作者 | 作者查看自己的文章 | 路径 `id` |
| `PUT` | `/api/author/articles/:id` | 作者 | 作者更新自己的文章 | 文章请求体 |
| `DELETE` | `/api/author/articles/:id` | 作者 | 作者删除自己的文章 | 路径 `id` |
| `POST` | `/api/admin/auth/login` | 无 | 管理员登录 | `account`, `password` |
| `POST` | `/api/admin/auth/logout` | 无 | 管理员退出 | 无 |
| `GET` | `/api/admin/auth/profile` | 管理员 | 获取管理员资料 | Bearer token |
| `GET` | `/api/admin/articles` | 管理员 | 管理员文章列表 | 分页、文章筛选参数、`authorId`, `status` |
| `GET` | `/api/admin/articles/:id` | 管理员 | 管理员查看任意文章 | 路径 `id` |
| `PUT` | `/api/admin/articles/:id` | 管理员 | 管理员更新任意文章 | 文章请求体 |
| `DELETE` | `/api/admin/articles/:id` | 管理员 | 管理员删除任意文章 | 路径 `id` |
| `POST` | `/api/admin/categories` | 管理员 | 创建分类 | `name`, `description` |
| `PUT` | `/api/admin/categories/:id` | 管理员 | 更新分类 | `name`, `description` |
| `DELETE` | `/api/admin/categories/:id` | 管理员 | 删除分类 | 路径 `id`，被文章引用时返回 `409` |
| `POST` | `/api/admin/tags` | 管理员 | 创建标签 | `name` |
| `PUT` | `/api/admin/tags/:id` | 管理员 | 更新标签 | `name` |
| `DELETE` | `/api/admin/tags/:id` | 管理员 | 删除标签 | 路径 `id`，被文章引用时返回 `409` |
| `GET` | `/api/admin/users` | 管理员 | 用户列表 | `page`, `pageSize`, `keyword`, `status` |
| `GET` | `/api/admin/users/:id` | 管理员 | 用户详情 | 路径 `id` |
| `DELETE` | `/api/admin/users/:id` | 管理员 | 删除用户 | 路径 `id`，当前管理员或有关联文章时返回 `409` |
| `PATCH` | `/api/admin/users/:id/status` | 管理员 | 启用或禁用作者 | `status`: `enabled` 或 `disabled` |

## 文章请求体

草稿可以缺少标题、正文和分类：

```json
{
  "status": "draft",
  "title": "",
  "summary": "",
  "coverUrl": "",
  "contentMarkdown": "",
  "categoryIds": [],
  "tagIds": []
}
```

发布文章至少需要标题、正文和一个分类：

```json
{
  "status": "published",
  "title": "文章标题",
  "summary": "摘要",
  "coverUrl": "",
  "contentMarkdown": "# Markdown",
  "categoryIds": [1],
  "tagIds": [1, 2]
}
```

## 常见错误码

| HTTP/code | 含义 |
| --- | --- |
| `400` | 请求体不是有效 JSON、资源 ID 无效或字段校验失败 |
| `401` | token 缺失、过期或账号密码错误 |
| `403` | 角色不匹配、账号被禁用或没有访问权限 |
| `404` | 用户、作者、文章、分类或标签不存在 |
| `405` | 请求方法不支持 |
| `409` | 删除资源被阻止，例如分类/标签被文章引用、用户有关联文章 |
| `500` | 数据库或 JWT 环境变量未配置，或服务器临时错误 |

## 数据库迁移和种子

首次使用新的数据库时执行：

```bash
npm run db:migrate
npm run db:seed
```

成功输出：

```text
Database migration complete
Database seed complete
```

数据库脚本会自动读取项目根目录的 `.env.local`，缺少 `.env.local` 时会后备读取 `.env`，也支持当前终端里的临时环境变量。如果 `.env.local`、`.env` 和当前终端都设置了 `DATABASE_URL`，当前终端里的非空值优先，然后是 `.env.local`，最后是 `.env`；空值会被忽略，避免挡住文件里的有效配置。如果本地没有配置 `DATABASE_URL`，这两个命令会失败，这是正常保护，避免误连未知数据库。

`db:migrate` 会把 `src/server/schema.sql` 拆成单条 SQL 逐条执行，降低 Neon HTTP driver 或连接池模式下一次提交多条语句导致迁移失败的风险。首次初始化 Neon 时，本地 `DATABASE_URL` 优先使用 direct 连接字符串；Vercel 项目环境变量里的 `DATABASE_URL` 使用 pooled 连接字符串。`db:seed` 会读取可选的 `SEED_ADMIN_*` 和 `SEED_AUTHOR_*` 环境变量来创建或更新初始登录账号。

## 本地验证命令

```bash
npm run test:backend
npm run verify
```

如果安装了 Vercel CLI 并且已配置数据库环境变量，可以运行：

```bash
vercel dev
```

然后手动检查：

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/categories
curl -X POST http://localhost:3000/api/auth/login -H "content-type: application/json" -d "{\"account\":\"author_demo\",\"password\":\"Author123456!\"}"
curl -X POST http://localhost:3000/api/admin/auth/login -H "content-type: application/json" -d "{\"account\":\"admin\",\"password\":\"Admin123456!\"}"
```

如果初始化数据库时设置了 `SEED_*` 覆盖变量，请把最后两条 curl 里的账号和密码替换为接手人自己的值。
