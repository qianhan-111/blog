import { getSql, type SqlQuery } from '../db.js'
import { isForeignKeyConstraintError } from '../db-errors.js'
import { ApiError } from '../errors.js'
import type {
  AdminArticleListQuery,
  ArticleDetail,
  ArticleFormPayload,
  ArticleListQuery,
  ArticlePrevNext,
  ArticleSummary,
  ArticleStatus,
  MyArticleListQuery,
  PaginatedResponse,
} from '../types.js'
import { getCategoriesByArticleId, getTagsByArticleId } from './taxonomy.js'

export interface ArticleWriteOptions {
  publishTime?: string | null
}

interface ArticleRow {
  id: number
  author_id: number
  author_username: string
  author_nickname: string
  author_avatar_url: string
  title: string
  summary: string
  cover_url: string
  content_markdown: string
  status: ArticleStatus
  publish_time: Date | string | null
  updated_at: Date | string
}

interface CountRow {
  total: string | number
}

interface OwnerRow {
  author_id: number
}

interface PrevNextRow {
  id: number
  title: string
}

interface ArticleTaxonomyWriteInput {
  categoryIds?: number[]
  tagIds?: number[]
}

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) {
    return ''
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function normalizePage(page: number): number {
  return Math.max(1, page)
}

function normalizePageSize(pageSize: number): number {
  return Math.max(1, Math.min(50, pageSize))
}

function mapArticleSummary(row: ArticleRow): ArticleSummary {
  return {
    id: Number(row.id),
    authorId: Number(row.author_id),
    author: {
      id: Number(row.author_id),
      username: row.author_username,
      nickname: row.author_nickname,
      avatarUrl: row.author_avatar_url,
    },
    title: row.title,
    summary: row.summary,
    coverUrl: row.cover_url,
    contentMarkdown: row.content_markdown,
    status: row.status,
    publishTime: toIsoString(row.publish_time),
    updatedAt: toIsoString(row.updated_at),
  }
}

async function mapArticleDetail(row: ArticleRow, sql: SqlQuery): Promise<ArticleDetail> {
  const summary = mapArticleSummary(row)
  const [categories, tags] = await Promise.all([
    getCategoriesByArticleId(summary.id, sql),
    getTagsByArticleId(summary.id, sql),
  ])

  return {
    ...summary,
    categories,
    tags,
  }
}

function articleSelectSql() {
  return `SELECT
    a.id,
    a.author_id,
    u.username AS author_username,
    u.nickname AS author_nickname,
    u.avatar_url AS author_avatar_url,
    a.title,
    a.summary,
    a.cover_url,
    a.content_markdown,
    a.status,
    a.publish_time,
    a.updated_at
  FROM articles a
  INNER JOIN users u ON u.id = a.author_id`
}

function addArticleFilters(
  where: string[],
  params: unknown[],
  query: ArticleListQuery,
): void {
  if (query.keyword) {
    params.push(`%${query.keyword}%`)
    where.push(`(a.title ILIKE $${params.length} OR a.summary ILIKE $${params.length})`)
  }

  if (query.categoryIds?.length) {
    params.push(query.categoryIds)
    where.push(`EXISTS (
      SELECT 1
      FROM article_categories ac
      WHERE ac.article_id = a.id AND ac.category_id = ANY($${params.length}::int[])
    )`)
  }

  if (query.tagIds?.length) {
    params.push(query.tagIds)
    where.push(`EXISTS (
      SELECT 1
      FROM article_tags at
      WHERE at.article_id = a.id AND at.tag_id = ANY($${params.length}::int[])
    )`)
  }
}

function sortSql(query: ArticleListQuery): string {
  const field = query.sortField === 'updateTime' ? 'a.updated_at' : 'a.publish_time'
  const order = query.sortOrder === 'asc' ? 'ASC' : 'DESC'

  return `${field} ${order}, a.id ${order}`
}

async function listArticles(
  where: string[],
  params: unknown[],
  query: ArticleListQuery,
  sql: SqlQuery,
): Promise<PaginatedResponse<ArticleSummary>> {
  const page = normalizePage(query.page)
  const pageSize = normalizePageSize(query.pageSize)
  const offset = (page - 1) * pageSize
  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const countRows = await sql.query(
    `SELECT COUNT(*) AS total
     FROM articles a
     INNER JOIN users u ON u.id = a.author_id
     ${whereSql}`,
    params,
  ) as CountRow[]
  const total = Number(countRows[0]?.total ?? 0)

  params.push(pageSize, offset)
  const rows = await sql.query(
    `${articleSelectSql()}
     ${whereSql}
     ORDER BY ${sortSql(query)}
     LIMIT $${params.length - 1}
     OFFSET $${params.length}`,
    params,
  ) as ArticleRow[]

  return {
    items: rows.map(mapArticleSummary),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function listPublicArticles(
  query: ArticleListQuery,
  sql: SqlQuery = getSql(),
) {
  const where = ["a.status = 'published'", "u.status = 'enabled'"]
  const params: unknown[] = []
  addArticleFilters(where, params, query)

  return listArticles(where, params, query, sql)
}

export async function listAuthorPublishedArticles(
  authorId: number,
  query: ArticleListQuery,
  sql: SqlQuery = getSql(),
) {
  const where = ["a.status = 'published'", "u.status = 'enabled'", 'a.author_id = $1']
  const params: unknown[] = [authorId]
  addArticleFilters(where, params, query)

  return listArticles(where, params, query, sql)
}

export async function listAuthorArticles(
  authorId: number,
  query: MyArticleListQuery,
  sql: SqlQuery = getSql(),
) {
  const where = ['a.author_id = $1']
  const params: unknown[] = [authorId]
  addArticleFilters(where, params, query)

  if (query.status) {
    params.push(query.status)
    where.push(`a.status = $${params.length}`)
  }

  return listArticles(where, params, query, sql)
}

export async function listAdminArticles(
  query: AdminArticleListQuery,
  sql: SqlQuery = getSql(),
) {
  const where: string[] = []
  const params: unknown[] = []
  addArticleFilters(where, params, query)

  if (query.status) {
    params.push(query.status)
    where.push(`a.status = $${params.length}`)
  }

  if (query.authorId) {
    params.push(query.authorId)
    where.push(`a.author_id = $${params.length}`)
  }

  return listArticles(where, params, query, sql)
}

async function getArticleDetail(
  id: number,
  options: { publicOnly: boolean },
  sql: SqlQuery,
) {
  const where = options.publicOnly ? "AND a.status = 'published' AND u.status = 'enabled'" : ''
  const rows = await sql.query(
    `${articleSelectSql()}
     WHERE a.id = $1 ${where}
     LIMIT 1`,
    [id],
  ) as ArticleRow[]
  const row = rows[0]

  return row ? mapArticleDetail(row, sql) : null
}

export function getPublicArticleDetail(id: number, sql: SqlQuery = getSql()) {
  return getArticleDetail(id, { publicOnly: true }, sql)
}

export function getArticleDetailById(id: number, sql: SqlQuery = getSql()) {
  return getArticleDetail(id, { publicOnly: false }, sql)
}

export async function getArticleOwnerId(id: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT author_id
     FROM articles
     WHERE id = $1
     LIMIT 1`,
    [id],
  ) as OwnerRow[]

  return rows[0] ? Number(rows[0].author_id) : null
}

export async function getArticlePrevNext(id: number, sql: SqlQuery = getSql()): Promise<ArticlePrevNext> {
  const currentRows = await sql.query(
    `SELECT a.publish_time
     FROM articles a
     INNER JOIN users u ON u.id = a.author_id
     WHERE a.id = $1
       AND a.status = 'published'
       AND u.status = 'enabled'
     LIMIT 1`,
    [id],
  ) as { publish_time: Date | string }[]
  const publishTime = currentRows[0]?.publish_time

  if (!publishTime) {
    return { prev: null, next: null }
  }

  const prevRows = await sql.query(
    `SELECT a.id, a.title
     FROM articles a
     INNER JOIN users u ON u.id = a.author_id
     WHERE a.status = 'published'
       AND u.status = 'enabled'
       AND (a.publish_time < $1 OR (a.publish_time = $1 AND a.id < $2))
     ORDER BY a.publish_time DESC, a.id DESC
     LIMIT 1`,
    [publishTime, id],
  ) as PrevNextRow[]
  const nextRows = await sql.query(
    `SELECT a.id, a.title
     FROM articles a
     INNER JOIN users u ON u.id = a.author_id
     WHERE a.status = 'published'
       AND u.status = 'enabled'
       AND (a.publish_time > $1 OR (a.publish_time = $1 AND a.id > $2))
     ORDER BY a.publish_time ASC, a.id ASC
     LIMIT 1`,
    [publishTime, id],
  ) as PrevNextRow[]

  return {
    prev: prevRows[0] ? { id: Number(prevRows[0].id), title: prevRows[0].title } : null,
    next: nextRows[0] ? { id: Number(nextRows[0].id), title: nextRows[0].title } : null,
  }
}

function getForeignKeyConstraintName(error: unknown): string {
  if (!error || typeof error !== 'object') {
    return ''
  }

  const constraint = (error as { constraint?: unknown }).constraint

  return typeof constraint === 'string' ? constraint : ''
}

function getTaxonomyForeignKeyMessage(
  error: unknown,
  taxonomy: ArticleTaxonomyWriteInput,
): string {
  const constraint = getForeignKeyConstraintName(error)

  if (constraint.includes('article_tags') || constraint.includes('tag_id')) {
    return '标签不存在'
  }

  if (constraint.includes('article_categories') || constraint.includes('category_id')) {
    return '分类不存在'
  }

  if ((taxonomy.tagIds?.length ?? 0) > 0 && (taxonomy.categoryIds?.length ?? 0) === 0) {
    return '标签不存在'
  }

  if ((taxonomy.categoryIds?.length ?? 0) > 0 && (taxonomy.tagIds?.length ?? 0) === 0) {
    return '分类不存在'
  }

  return '分类或标签不存在'
}

function appendArticleTaxonomyParams(
  params: unknown[],
  taxonomy: ArticleTaxonomyWriteInput,
) {
  return {
    categoryIdsIndex: params.push(taxonomy.categoryIds ?? []),
    replaceCategoriesIndex: params.push(Array.isArray(taxonomy.categoryIds)),
    tagIdsIndex: params.push(taxonomy.tagIds ?? []),
    replaceTagsIndex: params.push(Array.isArray(taxonomy.tagIds)),
  }
}

function buildAtomicArticleWriteSql(
  articleWriteSql: string,
  params: {
    categoryIdsIndex: number
    replaceCategoriesIndex: number
    replaceTagsIndex: number
    tagIdsIndex: number
  },
) {
  return `WITH written_article AS (
    ${articleWriteSql}
  ),
  deleted_categories AS (
    DELETE FROM article_categories
    WHERE article_id IN (SELECT id FROM written_article)
      AND $${params.replaceCategoriesIndex}::boolean
      AND NOT (category_id = ANY($${params.categoryIdsIndex}::int[]))
    RETURNING article_id
  ),
  inserted_categories AS (
    INSERT INTO article_categories (article_id, category_id)
    SELECT written_article.id, category_id
    FROM written_article
    CROSS JOIN unnest($${params.categoryIdsIndex}::int[]) AS category_id
    WHERE $${params.replaceCategoriesIndex}::boolean
    ON CONFLICT DO NOTHING
    RETURNING article_id
  ),
  deleted_tags AS (
    DELETE FROM article_tags
    WHERE article_id IN (SELECT id FROM written_article)
      AND $${params.replaceTagsIndex}::boolean
      AND NOT (tag_id = ANY($${params.tagIdsIndex}::int[]))
    RETURNING article_id
  ),
  inserted_tags AS (
    INSERT INTO article_tags (article_id, tag_id)
    SELECT written_article.id, tag_id
    FROM written_article
    CROSS JOIN unnest($${params.tagIdsIndex}::int[]) AS tag_id
    WHERE $${params.replaceTagsIndex}::boolean
    ON CONFLICT DO NOTHING
    RETURNING article_id
  )
  SELECT id FROM written_article`
}

async function writeArticleAndTaxonomy(
  articleWriteSql: string,
  params: unknown[],
  taxonomy: ArticleTaxonomyWriteInput,
  sql: SqlQuery,
): Promise<Array<Pick<ArticleRow, 'id'>>> {
  const taxonomyParams = appendArticleTaxonomyParams(params, taxonomy)

  try {
    return await sql.query(
      buildAtomicArticleWriteSql(articleWriteSql, taxonomyParams),
      params,
    ) as Array<Pick<ArticleRow, 'id'>>
  } catch (caughtError) {
    if (isForeignKeyConstraintError(caughtError)) {
      throw new ApiError(400, getTaxonomyForeignKeyMessage(caughtError, taxonomy))
    }

    throw caughtError
  }
}

async function assertIdsExist(
  ids: number[] | undefined,
  table: 'categories' | 'tags',
  message: string,
  sql: SqlQuery,
): Promise<void> {
  const uniqueIds = [...new Set(ids ?? [])]

  if (uniqueIds.length === 0) {
    return
  }

  const rows = await sql.query(
    `SELECT COUNT(*) AS total
     FROM ${table}
     WHERE id = ANY($1::int[])`,
    [uniqueIds],
  ) as CountRow[]

  if (Number(rows[0]?.total ?? 0) !== uniqueIds.length) {
    throw new ApiError(400, message)
  }
}

async function assertArticleTaxonomyExists(
  payload: Pick<ArticleFormPayload, 'categoryIds' | 'tagIds'>,
  sql: SqlQuery,
): Promise<void> {
  await assertIdsExist(payload.categoryIds, 'categories', '分类不存在', sql)
  await assertIdsExist(payload.tagIds, 'tags', '标签不存在', sql)
}

export async function createArticle(
  authorId: number,
  payload: ArticleFormPayload,
  options: ArticleWriteOptions,
  sql: SqlQuery = getSql(),
) {
  await assertArticleTaxonomyExists({
    categoryIds: payload.categoryIds ?? [],
    tagIds: payload.tagIds ?? [],
  }, sql)

  const rows = await writeArticleAndTaxonomy(
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
      authorId,
      payload.title ?? '',
      payload.summary ?? '',
      payload.coverUrl ?? '',
      payload.contentMarkdown ?? '',
      payload.status,
      options.publishTime ?? null,
    ],
    {
      categoryIds: payload.categoryIds ?? [],
      tagIds: payload.tagIds ?? [],
    },
    sql,
  )
  const id = Number(rows[0].id)

  const article = await getArticleDetailById(id, sql)

  if (!article) {
    throw new Error('Created article was not found')
  }

  return article
}

export async function updateArticle(
  id: number,
  payload: ArticleFormPayload,
  options: ArticleWriteOptions,
  sql: SqlQuery = getSql(),
) {
  await assertArticleTaxonomyExists(payload, sql)

  const params: unknown[] = [
    id,
    payload.title ?? null,
    payload.summary ?? null,
    payload.coverUrl ?? null,
    payload.contentMarkdown ?? null,
    payload.status,
  ]
  const publishTimeSql = Object.hasOwn(options, 'publishTime')
    ? `, publish_time = $${params.push(options.publishTime ?? null)}`
    : ''

  const updateRows = await writeArticleAndTaxonomy(
    `UPDATE articles
     SET
       title = COALESCE($2, title),
       summary = COALESCE($3, summary),
       cover_url = COALESCE($4, cover_url),
       content_markdown = COALESCE($5, content_markdown),
       status = $6,
       updated_at = now()
       ${publishTimeSql}
     WHERE id = $1
     RETURNING id`,
    params,
    {
      categoryIds: payload.categoryIds,
      tagIds: payload.tagIds,
    },
    sql,
  )

  if (updateRows.length === 0) {
    return null
  }

  return getArticleDetailById(id, sql)
}

export async function deleteArticle(id: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `DELETE FROM articles
     WHERE id = $1
     RETURNING id`,
    [id],
  ) as Array<Pick<ArticleRow, 'id'>>

  return rows.length > 0
}
