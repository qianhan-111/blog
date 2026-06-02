import type { Category } from '@/types/category'
import type { Tag } from '@/types/tag'
import type { UserProfile } from '@/types/user'

export type ArticleStatus = 'draft' | 'published'
export type ArticleSortField = 'publishTime' | 'updateTime'
export type SortOrder = 'asc' | 'desc'
export type ArticleAuthorSummary = Pick<UserProfile, 'id' | 'username' | 'nickname' | 'avatarUrl'>

export interface ArticleSummary {
  id: number
  authorId: number
  author: ArticleAuthorSummary
  title: string
  summary: string
  coverUrl: string
  contentMarkdown: string
  status: ArticleStatus
  publishTime: string
  updatedAt: string
}

export interface ArticleDetail extends ArticleSummary {
  categories: Category[]
  tags: Tag[]
}

export interface ArticlePrevNextItem {
  id: number
  title: string
}

export interface ArticlePrevNext {
  prev: ArticlePrevNextItem | null
  next: ArticlePrevNextItem | null
}

export interface PublicArticleListQuery {
  page: number
  pageSize: number
  keyword?: string
  categoryIds?: number[]
  tagIds?: number[]
  sortField?: ArticleSortField
  sortOrder?: SortOrder
}

export interface PublicArticleListFilterState {
  page: number
  pageSize: number
  keyword: string
  categoryIds: number[]
  tagIds: number[]
  sortField?: ArticleSortField
  sortOrder?: SortOrder
}

export interface PublicArticleFetchOptions {
  append?: boolean
}

export interface MyArticleListQuery extends PublicArticleListQuery {
  status?: ArticleStatus
}

export interface AdminArticleListQuery extends PublicArticleListQuery {
  authorId?: number
  status?: ArticleStatus
}

interface BaseArticleFormPayload {
  title?: string
  summary?: string
  coverUrl?: string
  contentMarkdown?: string
  categoryIds?: number[]
  tagIds?: number[]
}

export interface DraftArticlePayload extends BaseArticleFormPayload {
  status: 'draft'
}

export interface PublishedArticlePayload extends BaseArticleFormPayload {
  status: 'published'
  title: string
  contentMarkdown: string
  categoryIds: number[]
}

export type ArticleFormPayload = DraftArticlePayload | PublishedArticlePayload
