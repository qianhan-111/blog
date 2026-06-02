import { ApiError } from '../errors.js'
import * as articleRepository from '../repositories/articles.js'
import type {
  AdminArticleListQuery,
  ArticleDetail,
  ArticleFormPayload,
  ArticleListQuery,
  ArticlePrevNext,
  ArticleSummary,
  CurrentUser,
  MyArticleListQuery,
  PaginatedResponse,
} from '../types.js'

export interface ArticleRepository {
  createArticle(
    authorId: number,
    payload: ArticleFormPayload,
    options: articleRepository.ArticleWriteOptions,
  ): Promise<ArticleDetail>
  deleteArticle(id: number): Promise<boolean>
  getArticleDetailById(id: number): Promise<ArticleDetail | null>
  getArticleOwnerId(id: number): Promise<number | null>
  getArticlePrevNext(id: number): Promise<ArticlePrevNext>
  getPublicArticleDetail(id: number): Promise<ArticleDetail | null>
  listAdminArticles(query: AdminArticleListQuery): Promise<PaginatedResponse<ArticleSummary>>
  listAuthorArticles(authorId: number, query: MyArticleListQuery): Promise<PaginatedResponse<ArticleSummary>>
  listAuthorPublishedArticles(authorId: number, query: ArticleListQuery): Promise<PaginatedResponse<ArticleSummary>>
  listPublicArticles(query: ArticleListQuery): Promise<PaginatedResponse<ArticleSummary>>
  updateArticle(
    id: number,
    payload: ArticleFormPayload,
    options: articleRepository.ArticleWriteOptions,
  ): Promise<ArticleDetail | null>
}

const defaultArticleRepository: ArticleRepository = articleRepository

function assertEnabled(user: CurrentUser): void {
  if (user.status !== 'enabled') {
    throw new ApiError(403, '账号已被禁用')
  }
}

function assertRole(user: CurrentUser, role: 'author' | 'admin'): void {
  assertEnabled(user)

  if (user.role !== role) {
    throw new ApiError(403, '没有访问权限')
  }
}

async function assertAuthorOwnsArticle(
  repository: ArticleRepository,
  user: CurrentUser,
  id: number,
): Promise<void> {
  const ownerId = await repository.getArticleOwnerId(id)

  if (ownerId === null) {
    throw new ApiError(404, '文章不存在')
  }

  if (ownerId !== user.userId) {
    throw new ApiError(403, '不能访问其他作者的文章')
  }
}

function getPublishTimeOption(
  currentArticle: ArticleDetail | null,
  payload: ArticleFormPayload,
  now: () => Date,
): articleRepository.ArticleWriteOptions {
  if (payload.status === 'draft') {
    return { publishTime: null }
  }

  if (!currentArticle || currentArticle.status !== 'published') {
    return { publishTime: now().toISOString() }
  }

  return {}
}

export function createArticleService(
  repository: ArticleRepository = defaultArticleRepository,
  now: () => Date = () => new Date(),
) {
  return {
    listPublicArticles(query: ArticleListQuery) {
      return repository.listPublicArticles(query)
    },

    async getPublicArticleDetail(id: number) {
      const article = await repository.getPublicArticleDetail(id)

      if (!article) {
        throw new ApiError(404, '文章不存在')
      }

      return article
    },

    getArticlePrevNext(id: number) {
      return repository.getArticlePrevNext(id)
    },

    listAuthorPublishedArticles(authorId: number, query: ArticleListQuery) {
      return repository.listAuthorPublishedArticles(authorId, query)
    },

    listMyArticles(user: CurrentUser, query: MyArticleListQuery) {
      assertRole(user, 'author')
      return repository.listAuthorArticles(user.userId, query)
    },

    async getMyArticleDetail(user: CurrentUser, id: number) {
      assertRole(user, 'author')
      await assertAuthorOwnsArticle(repository, user, id)
      const article = await repository.getArticleDetailById(id)

      if (!article) {
        throw new ApiError(404, '文章不存在')
      }

      return article
    },

    createMyArticle(user: CurrentUser, payload: ArticleFormPayload) {
      assertRole(user, 'author')
      return repository.createArticle(user.userId, payload, getPublishTimeOption(null, payload, now))
    },

    async updateMyArticle(user: CurrentUser, id: number, payload: ArticleFormPayload) {
      assertRole(user, 'author')
      await assertAuthorOwnsArticle(repository, user, id)
      const currentArticle = await repository.getArticleDetailById(id)
      const article = await repository.updateArticle(
        id,
        payload,
        getPublishTimeOption(currentArticle, payload, now),
      )

      if (!article) {
        throw new ApiError(404, '文章不存在')
      }

      return article
    },

    async deleteMyArticle(user: CurrentUser, id: number) {
      assertRole(user, 'author')
      await assertAuthorOwnsArticle(repository, user, id)
      const deleted = await repository.deleteArticle(id)

      if (!deleted) {
        throw new ApiError(404, '文章不存在')
      }

      return null
    },

    listAdminArticles(user: CurrentUser, query: AdminArticleListQuery) {
      assertRole(user, 'admin')
      return repository.listAdminArticles(query)
    },

    async getAdminArticleDetail(user: CurrentUser, id: number) {
      assertRole(user, 'admin')
      const article = await repository.getArticleDetailById(id)

      if (!article) {
        throw new ApiError(404, '文章不存在')
      }

      return article
    },

    async updateAdminArticle(user: CurrentUser, id: number, payload: ArticleFormPayload) {
      assertRole(user, 'admin')
      const currentArticle = await repository.getArticleDetailById(id)

      if (!currentArticle) {
        throw new ApiError(404, '文章不存在')
      }

      const article = await repository.updateArticle(
        id,
        payload,
        getPublishTimeOption(currentArticle, payload, now),
      )

      if (!article) {
        throw new ApiError(404, '文章不存在')
      }

      return article
    },

    async deleteAdminArticle(user: CurrentUser, id: number) {
      assertRole(user, 'admin')
      const deleted = await repository.deleteArticle(id)

      if (!deleted) {
        throw new ApiError(404, '文章不存在')
      }

      return null
    },
  }
}

export const articleService = createArticleService()
