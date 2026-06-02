import { createHttpClient } from '@/api/client'
import type { PaginatedResponse } from '@/types/api'
import type {
  AdminArticleListQuery,
  ArticleDetail,
  ArticleFormPayload,
  ArticleSummary,
  MyArticleListQuery,
} from '@/types/article'

const userClient = createHttpClient('user')
const adminClient = createHttpClient('admin')

export function getMyArticles(params: MyArticleListQuery) {
  return userClient.get<PaginatedResponse<ArticleSummary>>('/author/articles', { params })
}

export function getMyArticleDetail(id: number) {
  return userClient.get<ArticleDetail>(`/author/articles/${id}`)
}

export function createMyArticle(payload: ArticleFormPayload) {
  return userClient.post<ArticleDetail, ArticleFormPayload>('/author/articles', payload)
}

export function updateMyArticle(id: number, payload: ArticleFormPayload) {
  return userClient.put<ArticleDetail, ArticleFormPayload>(`/author/articles/${id}`, payload)
}

export function deleteMyArticle(id: number) {
  return userClient.delete<null>(`/author/articles/${id}`)
}

export function getAdminArticles(params: AdminArticleListQuery) {
  return adminClient.get<PaginatedResponse<ArticleSummary>>('/admin/articles', { params })
}

export function getAdminArticleDetail(id: number) {
  return adminClient.get<ArticleDetail>(`/admin/articles/${id}`)
}

export function updateAdminArticle(id: number, payload: ArticleFormPayload) {
  return adminClient.put<ArticleDetail, ArticleFormPayload>(`/admin/articles/${id}`, payload)
}

export function deleteAdminArticle(id: number) {
  return adminClient.delete<null>(`/admin/articles/${id}`)
}
