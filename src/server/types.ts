export type UserRole = 'author' | 'admin'
export type UserStatus = 'enabled' | 'disabled'
export type ArticleStatus = 'draft' | 'published'
export type ArticleSortField = 'publishTime' | 'updateTime'
export type SortOrder = 'asc' | 'desc'

export interface AuthClaims {
  userId: number
  role: UserRole
}

export interface CurrentUser extends AuthClaims {
  username: string
  email: string
  nickname: string
  status: UserStatus
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginatedResponse<T> {
  items: T[]
  meta: PaginationMeta
}

export interface UserProfile {
  id: number
  username: string
  email: string
  nickname: string
  avatarUrl: string
  bio: string
  role: UserRole
  status: UserStatus
  createdAt: string
  updatedAt: string
}

export interface AdminProfile {
  id: number
  username: string
  nickname: string
}

export interface PublicAuthorProfile {
  id: number
  username: string
  nickname: string
  avatarUrl: string
  bio: string
}

export interface Category {
  id: number
  name: string
  description: string
  createdAt: string
}

export interface Tag {
  id: number
  name: string
  createdAt: string
}

export interface ArticleAuthorSummary {
  id: number
  username: string
  nickname: string
  avatarUrl: string
}

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

export interface CategoryPayload {
  name: string
  description: string
}

export interface TagPayload {
  name: string
}

export interface UserProfileUpdatePayload {
  nickname?: string
  avatarUrl?: string
  bio?: string
}

export interface LoginCredentials {
  account: string
  password: string
}

export interface RegisterPayload {
  username: string
  email: string
  password: string
  confirmPassword: string
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

export interface ArticleListQuery {
  page: number
  pageSize: number
  keyword?: string
  categoryIds?: number[]
  tagIds?: number[]
  sortField?: ArticleSortField
  sortOrder?: SortOrder
}

export interface MyArticleListQuery extends ArticleListQuery {
  status?: ArticleStatus
}

export interface AdminArticleListQuery extends MyArticleListQuery {
  authorId?: number
}

export interface AdminUserListQuery {
  page: number
  pageSize: number
  keyword?: string
  status?: UserStatus
}
