import { getSql, type SqlQuery } from '../db.js'
import type {
  AdminProfile,
  AdminUserListQuery,
  PaginatedResponse,
  PublicAuthorProfile,
  UserProfile,
  UserProfileUpdatePayload,
  UserRole,
  UserStatus,
} from '../types.js'

interface UserRow {
  id: number
  username: string
  email: string
  password_hash?: string
  nickname: string
  avatar_url: string
  bio: string
  role: UserRole
  status: UserStatus
  created_at: Date | string
  updated_at: Date | string
}

interface CountRow {
  total: string | number
}

function toIsoString(value: Date | string | null | undefined): string {
  if (!value) {
    return ''
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

export interface UserWithPassword extends UserProfile {
  passwordHash: string
}

export function mapUserProfile(row: UserRow): UserProfile {
  return {
    id: Number(row.id),
    username: row.username,
    email: row.email,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    role: row.role,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  }
}

export function mapAdminProfile(row: UserRow): AdminProfile {
  return {
    id: Number(row.id),
    username: row.username,
    nickname: row.nickname,
  }
}

export function mapPublicAuthorProfile(row: UserRow): PublicAuthorProfile {
  return {
    id: Number(row.id),
    username: row.username,
    nickname: row.nickname,
    avatarUrl: row.avatar_url,
    bio: row.bio,
  }
}

function normalizePage(page: number): number {
  return Math.max(1, page)
}

function normalizePageSize(pageSize: number): number {
  return Math.max(1, Math.min(50, pageSize))
}

export async function findUserByAccount(account: string, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT *
     FROM users
     WHERE username = $1 OR email = $1
     LIMIT 1`,
    [account],
  ) as UserRow[]
  const row = rows[0]

  if (!row?.password_hash) {
    return null
  }

  return {
    ...mapUserProfile(row),
    passwordHash: row.password_hash,
  } satisfies UserWithPassword
}

export async function findUserById(id: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT *
     FROM users
     WHERE id = $1
     LIMIT 1`,
    [id],
  ) as UserRow[]
  const row = rows[0]

  return row ? mapUserProfile(row) : null
}

export async function findPublicAuthorById(id: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT *
     FROM users
     WHERE id = $1 AND role = 'author' AND status = 'enabled'
     LIMIT 1`,
    [id],
  ) as UserRow[]
  const row = rows[0]

  return row ? mapPublicAuthorProfile(row) : null
}

export async function createAuthor(
  input: {
    username: string
    email: string
    passwordHash: string
  },
  sql: SqlQuery = getSql(),
) {
  const rows = await sql.query(
    `INSERT INTO users (username, email, password_hash, nickname, role, status)
     VALUES ($1, $2, $3, $1, 'author', 'enabled')
     RETURNING *`,
    [input.username, input.email, input.passwordHash],
  ) as UserRow[]

  return mapUserProfile(rows[0])
}

export async function updateUserProfile(
  id: number,
  payload: UserProfileUpdatePayload,
  sql: SqlQuery = getSql(),
) {
  const rows = await sql.query(
    `UPDATE users
     SET
       nickname = COALESCE($2, nickname),
       avatar_url = COALESCE($3, avatar_url),
       bio = COALESCE($4, bio),
       updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, payload.nickname ?? null, payload.avatarUrl ?? null, payload.bio ?? null],
  ) as UserRow[]
  const row = rows[0]

  return row ? mapUserProfile(row) : null
}

export async function listUsers(
  query: AdminUserListQuery,
  sql: SqlQuery = getSql(),
): Promise<PaginatedResponse<UserProfile>> {
  const page = normalizePage(query.page)
  const pageSize = normalizePageSize(query.pageSize)
  const offset = (page - 1) * pageSize
  const where: string[] = []
  const params: unknown[] = []

  if (query.keyword) {
    params.push(`%${query.keyword}%`)
    where.push(`(username ILIKE $${params.length} OR email ILIKE $${params.length} OR nickname ILIKE $${params.length})`)
  }

  if (query.status) {
    params.push(query.status)
    where.push(`status = $${params.length}`)
  }

  const whereSql = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
  const countRows = await sql.query(
    `SELECT COUNT(*) AS total
     FROM users
     ${whereSql}`,
    params,
  ) as CountRow[]
  const total = Number(countRows[0]?.total ?? 0)
  params.push(pageSize, offset)
  const rows = await sql.query(
    `SELECT *
     FROM users
     ${whereSql}
     ORDER BY created_at DESC, id DESC
     LIMIT $${params.length - 1}
     OFFSET $${params.length}`,
    params,
  ) as UserRow[]

  return {
    items: rows.map(mapUserProfile),
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  }
}

export async function updateUserStatus(
  id: number,
  status: UserStatus,
  sql: SqlQuery = getSql(),
) {
  const rows = await sql.query(
    `UPDATE users
     SET status = $2, updated_at = now()
     WHERE id = $1
     RETURNING *`,
    [id, status],
  ) as UserRow[]
  const row = rows[0]

  return row ? mapUserProfile(row) : null
}

export async function userHasArticles(id: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `SELECT COUNT(*) AS total
     FROM articles
     WHERE author_id = $1`,
    [id],
  ) as CountRow[]

  return Number(rows[0]?.total ?? 0) > 0
}

export async function deleteUser(id: number, sql: SqlQuery = getSql()) {
  const rows = await sql.query(
    `DELETE FROM users
     WHERE id = $1
     RETURNING id`,
    [id],
  ) as Array<Pick<UserRow, 'id'>>

  return rows.length > 0
}
