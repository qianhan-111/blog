import { neon } from '@neondatabase/serverless'
import bcrypt from 'bcryptjs'

import { loadDatabaseScriptEnv } from './db-script-env'
import { readSeedUsers } from './db-seed-config'

const databaseUrl = loadDatabaseScriptEnv()

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required')
}

const sql = neon(databaseUrl)
const seedUsers = readSeedUsers()

interface IdRow {
  id: number
}

async function upsertUser(input: {
  username: string
  email: string
  password: string
  nickname: string
  role: 'author' | 'admin'
  bio?: string
}) {
  const passwordHash = await bcrypt.hash(input.password, 10)
  const rows = await sql.query(
    `INSERT INTO users (username, email, password_hash, nickname, role, status, bio, updated_at)
     VALUES ($1, $2, $3, $4, $5, 'enabled', $6, now())
     ON CONFLICT (username)
     DO UPDATE SET
       email = EXCLUDED.email,
       password_hash = EXCLUDED.password_hash,
       nickname = EXCLUDED.nickname,
       role = EXCLUDED.role,
       status = 'enabled',
       bio = EXCLUDED.bio,
       updated_at = now()
     RETURNING id`,
    [input.username, input.email, passwordHash, input.nickname, input.role, input.bio ?? ''],
  )

  return Number((rows[0] as IdRow).id)
}

async function upsertCategory(name: string, description: string) {
  const rows = await sql.query(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2)
     ON CONFLICT (name)
     DO UPDATE SET description = EXCLUDED.description
     RETURNING id`,
    [name, description],
  )

  return Number((rows[0] as IdRow).id)
}

async function upsertTag(name: string) {
  const rows = await sql.query(
    `INSERT INTO tags (name)
     VALUES ($1)
     ON CONFLICT (name)
     DO UPDATE SET name = EXCLUDED.name
     RETURNING id`,
    [name],
  )

  return Number((rows[0] as IdRow).id)
}

async function upsertArticle(input: {
  authorId: number
  title: string
  summary: string
  contentMarkdown: string
  status: 'draft' | 'published'
  categoryIds: number[]
  tagIds: number[]
  coverUrl?: string
  publishTime?: string
}) {
  const existingRows = await sql.query(
    `SELECT id
     FROM articles
     WHERE author_id = $1 AND title = $2
     ORDER BY id ASC
     LIMIT 1`,
    [input.authorId, input.title],
  )
  const existingId = (existingRows[0] as IdRow | undefined)?.id
  const rows = existingId
    ? await sql.query(
      `UPDATE articles
       SET
         summary = $2,
         cover_url = $3,
         content_markdown = $4,
         status = $5,
         publish_time = $6,
         updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [
        existingId,
        input.summary,
        input.coverUrl ?? '',
        input.contentMarkdown,
        input.status,
        input.publishTime ?? null,
      ],
    )
    : await sql.query(
      `INSERT INTO articles (
         author_id,
         title,
         summary,
         cover_url,
         content_markdown,
         status,
         publish_time,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, now())
       RETURNING id`,
      [
        input.authorId,
        input.title,
        input.summary,
        input.coverUrl ?? '',
        input.contentMarkdown,
        input.status,
        input.publishTime ?? null,
      ],
    )
  const articleId = Number((rows[0] as IdRow).id)

  await sql.query('DELETE FROM article_categories WHERE article_id = $1', [articleId])
  await sql.query('DELETE FROM article_tags WHERE article_id = $1', [articleId])

  for (const categoryId of input.categoryIds) {
    await sql.query(
      `INSERT INTO article_categories (article_id, category_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, categoryId],
    )
  }

  for (const tagId of input.tagIds) {
    await sql.query(
      `INSERT INTO article_tags (article_id, tag_id)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [articleId, tagId],
    )
  }
}

const adminId = await upsertUser({
  username: seedUsers.admin.username,
  email: seedUsers.admin.email,
  password: seedUsers.admin.password,
  nickname: seedUsers.admin.nickname,
  role: 'admin',
  bio: seedUsers.admin.bio,
})

const authorId = await upsertUser({
  username: seedUsers.author.username,
  email: seedUsers.author.email,
  password: seedUsers.author.password,
  nickname: seedUsers.author.nickname,
  role: 'author',
  bio: seedUsers.author.bio,
})

void adminId

const categoryIds = {
  vue: await upsertCategory('Vue 3', 'Vue 3 组合式 API、状态管理与前端工程实践。'),
  backend: await upsertCategory('后端接口', 'REST API、认证、数据库与部署相关内容。'),
  deploy: await upsertCategory('部署上线', 'Vercel、环境变量与发布检查。'),
  writing: await upsertCategory('写作方法', '内容组织、Markdown 和技术表达。'),
}

const tagIds = {
  vite: await upsertTag('Vite'),
  pinia: await upsertTag('Pinia'),
  jwt: await upsertTag('JWT'),
  postgres: await upsertTag('PostgreSQL'),
  vercel: await upsertTag('Vercel'),
  markdown: await upsertTag('Markdown'),
}

const articles = [
  {
    title: '用 Vue 3 搭建博客前台',
    summary: '从信息流、筛选到文章详情，梳理一个博客前台的核心体验。',
    contentMarkdown: '# 用 Vue 3 搭建博客前台\n\n这篇文章介绍公开博客前台的页面结构、状态管理和数据加载方式。',
    status: 'published' as const,
    categoryIds: [categoryIds.vue],
    tagIds: [tagIds.vite, tagIds.pinia],
    publishTime: '2026-05-01T09:00:00.000Z',
  },
  {
    title: '作者后台的文章草稿流程',
    summary: '保存草稿、继续编辑、最终发布，是作者后台最重要的闭环。',
    contentMarkdown: '# 作者后台的文章草稿流程\n\n作者可以先保存草稿，再补充分类、标签和正文后发布。',
    status: 'published' as const,
    categoryIds: [categoryIds.vue, categoryIds.writing],
    tagIds: [tagIds.markdown, tagIds.pinia],
    publishTime: '2026-05-03T09:00:00.000Z',
  },
  {
    title: 'JWT 登录认证如何连接前后端',
    summary: 'JWT 让前端能够在请求里携带登录身份，后端负责签发和校验。',
    contentMarkdown: '# JWT 登录认证如何连接前后端\n\n登录成功后，后端签发 token。前端请求受保护接口时通过 Authorization 头携带 token。',
    status: 'published' as const,
    categoryIds: [categoryIds.backend],
    tagIds: [tagIds.jwt],
    publishTime: '2026-05-05T09:00:00.000Z',
  },
  {
    title: 'PostgreSQL 数据模型设计笔记',
    summary: '文章、分类、标签和用户之间的关系决定了后台管理能力。',
    contentMarkdown: '# PostgreSQL 数据模型设计笔记\n\n博客系统使用用户、文章、分类、标签和两张关联表表达内容关系。',
    status: 'published' as const,
    categoryIds: [categoryIds.backend],
    tagIds: [tagIds.postgres],
    publishTime: '2026-05-07T09:00:00.000Z',
  },
  {
    title: 'Vercel 上线前要检查什么',
    summary: '上线不仅是能构建，还要检查环境变量、路由回退和 API 可用性。',
    contentMarkdown: '# Vercel 上线前要检查什么\n\n部署前应确认 API、站点地址、索引开关和版本号都来自真实环境。',
    status: 'published' as const,
    categoryIds: [categoryIds.deploy],
    tagIds: [tagIds.vercel],
    publishTime: '2026-05-09T09:00:00.000Z',
  },
  {
    title: 'Markdown 技术文章的结构',
    summary: '好的技术文章通常先给结论，再展开背景、步骤和验证结果。',
    contentMarkdown: '# Markdown 技术文章的结构\n\nMarkdown 适合组织标题、列表、代码块和引用，是博客编辑器的自然选择。',
    status: 'published' as const,
    categoryIds: [categoryIds.writing],
    tagIds: [tagIds.markdown],
    publishTime: '2026-05-11T09:00:00.000Z',
  },
  {
    title: '草稿：后台错误处理优化',
    summary: '这是一篇演示草稿，公开列表不会展示。',
    contentMarkdown: '# 草稿：后台错误处理优化\n\n草稿内容仅作者本人和管理员可见。',
    status: 'draft' as const,
    categoryIds: [categoryIds.backend],
    tagIds: [tagIds.jwt],
  },
  {
    title: '草稿：移动端后台适配',
    summary: '这是一篇演示草稿，用于验证作者文章筛选。',
    contentMarkdown: '# 草稿：移动端后台适配\n\n移动端后台可以把表格降级成卡片列表。',
    status: 'draft' as const,
    categoryIds: [categoryIds.vue],
    tagIds: [tagIds.vite],
  },
]

for (const article of articles) {
  await upsertArticle({
    authorId,
    ...article,
  })
}

console.log('Database seed complete')
