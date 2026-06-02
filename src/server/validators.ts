import { z } from 'zod'

import type {
  AdminArticleListQuery,
  ArticleListQuery,
  ArticleSortField,
  MyArticleListQuery,
  SortOrder,
} from './types.js'

const trimmedString = z.string().trim()
const optionalText = z.string().trim().max(1000).optional().default('')
const optionalUrlText = z.string().trim().max(500).optional().default('')
const optionalProfileText = z.string().trim().max(1000).optional()
const optionalProfileUrlText = z.string().trim().max(500).optional()
const idSchema = z.coerce.number().int().positive()
const payloadIdSchema = z.number().int().positive()

function parseStrictPositiveInt(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return null
  }

  const text = String(value).trim()

  if (!/^\d+$/.test(text)) {
    return null
  }

  const parsed = Number(text)

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function parseNumberList(value: unknown): number[] {
  if (value === undefined || value === null || value === '') {
    return []
  }

  const rawItems = Array.isArray(value) ? value : String(value).split(',')

  return rawItems
    .flatMap((item) => String(item).split(','))
    .map((item) => parseStrictPositiveInt(item))
    .filter((item): item is number => item !== null)
}

function normalizeArticleListQueryInput(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value
  }

  const query = value as Record<string, unknown>

  return {
    ...query,
    categoryIds: query.categoryIds ?? query['categoryIds[]'],
    tagIds: query.tagIds ?? query['tagIds[]'],
    sortField: normalizeOptionalQueryValue(query.sortField),
    sortOrder: normalizeOptionalQueryValue(query.sortOrder),
  }
}

function normalizeOptionalQueryValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    const firstValue = value[0]
    return firstValue === '' ? undefined : firstValue
  }

  return value === '' ? undefined : value
}

function normalizeAdminUserListQueryInput(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return value
  }

  const query = value as Record<string, unknown>

  return {
    ...query,
    status: normalizeOptionalQueryValue(query.status),
  }
}

export const loginPayloadSchema = z.object({
  account: trimmedString.min(1, '请输入账号'),
  password: z.string().min(1, '请输入密码'),
})

export const registerPayloadSchema = z.object({
  username: trimmedString.min(2, '用户名至少 2 位').max(40, '用户名过长'),
  email: trimmedString.email('请输入有效邮箱'),
  password: z.string().min(6, '密码至少 6 位').max(100, '密码过长'),
  confirmPassword: z.string().min(6, '确认密码至少 6 位'),
}).refine((payload) => payload.password === payload.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword'],
})

export const profileUpdateSchema = z.object({
  nickname: optionalProfileText,
  avatarUrl: optionalProfileUrlText,
  bio: optionalProfileText,
})

const baseArticlePayloadSchema = z.object({
  title: optionalText,
  summary: optionalText,
  coverUrl: optionalUrlText,
  contentMarkdown: z.string().trim().max(50_000).optional().default(''),
  categoryIds: z.array(payloadIdSchema).optional().default([]),
  tagIds: z.array(payloadIdSchema).optional().default([]),
})

const draftArticlePayloadSchema = baseArticlePayloadSchema.extend({
  status: z.literal('draft'),
})

const publishedArticlePayloadSchema = baseArticlePayloadSchema.extend({
  status: z.literal('published'),
  title: trimmedString.min(1, '文章标题不能为空').max(200, '文章标题过长'),
  contentMarkdown: z.string().trim().min(1, '文章内容不能为空').max(50_000),
  categoryIds: z.array(payloadIdSchema).min(1, '发布文章至少选择一个分类'),
})

export const articlePayloadSchema = z.discriminatedUnion('status', [
  draftArticlePayloadSchema,
  publishedArticlePayloadSchema,
])

export const categoryPayloadSchema = z.object({
  name: trimmedString.min(1, '分类名称不能为空').max(80, '分类名称过长'),
  description: optionalText,
})

export const tagPayloadSchema = z.object({
  name: trimmedString.min(1, '标签名称不能为空').max(40, '标签名称过长'),
})

export const userStatusPayloadSchema = z.object({
  status: z.enum(['enabled', 'disabled']),
})

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().catch(1),
  pageSize: z.coerce.number().int().positive().max(50).catch(20),
})

const articleListQueryObjectSchema = paginationQuerySchema.extend({
  keyword: trimmedString.optional().default(''),
  categoryIds: z.preprocess(parseNumberList, z.array(idSchema)).optional().default([]),
  tagIds: z.preprocess(parseNumberList, z.array(idSchema)).optional().default([]),
  sortField: z.enum(['publishTime', 'updateTime']).optional() as z.ZodOptional<z.ZodEnum<{
    publishTime: 'publishTime'
    updateTime: 'updateTime'
  }>>,
  sortOrder: z.enum(['asc', 'desc']).optional() as z.ZodOptional<z.ZodEnum<{
    asc: 'asc'
    desc: 'desc'
  }>>,
})

export const articleListQuerySchema = z.preprocess(
  normalizeArticleListQueryInput,
  articleListQueryObjectSchema,
)

export const authorArticleListQuerySchema = z.preprocess(
  normalizeArticleListQueryInput,
  articleListQueryObjectSchema.extend({
    status: z.preprocess(normalizeOptionalQueryValue, z.enum(['draft', 'published']).optional()),
  }),
)

export const adminArticleListQuerySchema = z.preprocess(
  normalizeArticleListQueryInput,
  articleListQueryObjectSchema.extend({
    status: z.preprocess(normalizeOptionalQueryValue, z.enum(['draft', 'published']).optional()),
    authorId: z.preprocess(normalizeOptionalQueryValue, z.coerce.number().int().positive().optional()),
  }),
)

export const adminUserListQuerySchema = z.preprocess(
  normalizeAdminUserListQueryInput,
  paginationQuerySchema.extend({
    keyword: trimmedString.optional().default(''),
    status: z.enum(['enabled', 'disabled']).optional(),
  }),
)

type ParsedArticleListQuery = z.infer<typeof articleListQuerySchema> & {
  page?: number
  pageSize?: number
  keyword?: string
  categoryIds?: number[]
  tagIds?: number[]
  sortField?: ArticleSortField
  sortOrder?: SortOrder
}

type ParsedAuthorArticleListQuery = ParsedArticleListQuery & {
  status?: MyArticleListQuery['status']
}

type ParsedAdminArticleListQuery = ParsedAuthorArticleListQuery & {
  authorId?: AdminArticleListQuery['authorId']
}

function normalizeParsedArticleListQuery(query: ParsedArticleListQuery): ArticleListQuery {
  return {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    keyword: query.keyword ?? '',
    categoryIds: query.categoryIds ?? [],
    tagIds: query.tagIds ?? [],
    sortField: query.sortField,
    sortOrder: query.sortOrder,
  }
}

export function parseArticleListQuery(input: unknown): ArticleListQuery {
  return normalizeParsedArticleListQuery(articleListQuerySchema.parse(input))
}

export function parseAuthorArticleListQuery(input: unknown): MyArticleListQuery {
  const query = authorArticleListQuerySchema.parse(input) as ParsedAuthorArticleListQuery

  return {
    ...normalizeParsedArticleListQuery(query),
    status: query.status,
  }
}

export function parseAdminArticleListQuery(input: unknown): AdminArticleListQuery {
  const query = adminArticleListQuerySchema.parse(input) as ParsedAdminArticleListQuery

  return {
    ...normalizeParsedArticleListQuery(query),
    status: query.status,
    authorId: query.authorId,
  }
}
