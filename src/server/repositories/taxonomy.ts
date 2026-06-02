import { getSql, type SqlQuery } from '../db.js'
import type { Category, CategoryPayload, Tag, TagPayload } from '../types.js'

interface CategoryRow {
  id: number
  name: string
  description: string
  created_at: Date | string
}

interface TagRow {
  id: number
  name: string
  created_at: Date | string
}

interface CountRow {
  total: string | number
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export function mapCategory(row: CategoryRow): Category {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    createdAt: toIsoString(row.created_at),
  }
}

export function mapTag(row: TagRow): Tag {
  return {
    id: Number(row.id),
    name: row.name,
    createdAt: toIsoString(row.created_at),
  }
}

export async function listCategories(sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT *
     FROM categories
     ORDER BY created_at ASC, id ASC`,
  ) as CategoryRow[]

  return rows.map(mapCategory)
}

export async function listTags(sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT *
     FROM tags
     ORDER BY created_at ASC, id ASC`,
  ) as TagRow[]

  return rows.map(mapTag)
}

export async function createCategory(payload: CategoryPayload, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `INSERT INTO categories (name, description)
     VALUES ($1, $2)
     RETURNING *`,
    [payload.name, payload.description],
  ) as CategoryRow[]

  return mapCategory(rows[0])
}

export async function updateCategory(
  id: number,
  payload: CategoryPayload,
  sql: SqlQuery = getSql(),
) {
  const rows = await sql.query(
    `UPDATE categories
     SET name = $2, description = $3
     WHERE id = $1
     RETURNING *`,
    [id, payload.name, payload.description],
  ) as CategoryRow[]
  const row = rows[0]

  return row ? mapCategory(row) : null
}

export async function deleteCategory(id: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `DELETE FROM categories
     WHERE id = $1
     RETURNING id`,
    [id],
  ) as Array<Pick<CategoryRow, 'id'>>

  return rows.length > 0
}

export async function createTag(payload: TagPayload, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `INSERT INTO tags (name)
     VALUES ($1)
     RETURNING *`,
    [payload.name],
  ) as TagRow[]

  return mapTag(rows[0])
}

export async function updateTag(id: number, payload: TagPayload, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `UPDATE tags
     SET name = $2
     WHERE id = $1
     RETURNING *`,
    [id, payload.name],
  ) as TagRow[]
  const row = rows[0]

  return row ? mapTag(row) : null
}

export async function deleteTag(id: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `DELETE FROM tags
     WHERE id = $1
     RETURNING id`,
    [id],
  ) as Array<Pick<TagRow, 'id'>>

  return rows.length > 0
}

export async function isCategoryReferenced(id: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT COUNT(*) AS total
     FROM article_categories
     WHERE category_id = $1`,
    [id],
  ) as CountRow[]

  return Number(rows[0]?.total ?? 0) > 0
}

export async function isTagReferenced(id: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT COUNT(*) AS total
     FROM article_tags
     WHERE tag_id = $1`,
    [id],
  ) as CountRow[]

  return Number(rows[0]?.total ?? 0) > 0
}

export async function getCategoriesByArticleId(articleId: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT c.*
     FROM categories c
     INNER JOIN article_categories ac ON ac.category_id = c.id
     WHERE ac.article_id = $1
     ORDER BY c.created_at ASC, c.id ASC`,
    [articleId],
  ) as CategoryRow[]

  return rows.map(mapCategory)
}

export async function getTagsByArticleId(articleId: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT t.*
     FROM tags t
     INNER JOIN article_tags at ON at.tag_id = t.id
     WHERE at.article_id = $1
     ORDER BY t.created_at ASC, t.id ASC`,
    [articleId],
  ) as TagRow[]

  return rows.map(mapTag)
}
