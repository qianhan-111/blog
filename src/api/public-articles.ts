import { createHttpClient } from '@/api/client'
import type { PaginatedResponse } from '@/types/api'
import type {
  ArticleDetail,
  ArticlePrevNext,
  ArticleSummary,
  PublicArticleListQuery,
} from '@/types/article'
import type { PublicAuthorProfile } from '@/types/user'

const publicClient = createHttpClient('public')

export function getPublicArticles(params: PublicArticleListQuery) {
  return publicClient.get<PaginatedResponse<ArticleSummary>>('/articles', { params })
}

export function getArticleDetail(id: number) {
  return publicClient.get<ArticleDetail>(`/articles/${id}`)
}

export function getArticlePrevNext(id: number) {
  return publicClient.get<ArticlePrevNext>(`/articles/${id}/prev-next`)
}

export function getAuthorProfile(authorId: number) {
  return publicClient.get<PublicAuthorProfile>(`/authors/${authorId}`)
}

export function getAuthorArticles(authorId: number, params: PublicArticleListQuery) {
  return publicClient.get<PaginatedResponse<ArticleSummary>>(`/authors/${authorId}/articles`, {
    params,
  })
}
