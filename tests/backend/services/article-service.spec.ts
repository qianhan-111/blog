// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { ApiError } from '../../../src/server/errors'
import { createArticleService, type ArticleRepository } from '../../../src/server/services/article-service'
import type { ArticleDetail, ArticleFormPayload, CurrentUser, PaginatedResponse } from '../../../src/server/types'

const author: CurrentUser = {
  userId: 7,
  role: 'author',
  username: 'author',
  email: 'author@example.com',
  nickname: 'Author',
  status: 'enabled',
}

const admin: CurrentUser = {
  userId: 1,
  role: 'admin',
  username: 'admin',
  email: 'admin@example.com',
  nickname: 'Admin',
  status: 'enabled',
}

const draftArticle: ArticleDetail = {
  id: 10,
  authorId: 7,
  author: {
    id: 7,
    username: 'author',
    nickname: 'Author',
    avatarUrl: '',
  },
  title: 'Draft',
  summary: '',
  coverUrl: '',
  contentMarkdown: 'draft',
  status: 'draft',
  publishTime: '',
  updatedAt: '2026-05-17T00:00:00.000Z',
  categories: [],
  tags: [],
}

function createRepository(overrides: Partial<ArticleRepository> = {}): ArticleRepository {
  const emptyPage: PaginatedResponse<ArticleDetail> = {
    items: [],
    meta: {
      page: 1,
      pageSize: 20,
      total: 0,
      totalPages: 0,
    },
  }

  return {
    createArticle: vi.fn(async () => draftArticle),
    deleteArticle: vi.fn(async () => true),
    getArticleDetailById: vi.fn(async () => draftArticle),
    getArticleOwnerId: vi.fn(async () => 7),
    getArticlePrevNext: vi.fn(async () => ({ prev: null, next: null })),
    getPublicArticleDetail: vi.fn(async () => null),
    listAdminArticles: vi.fn(async () => emptyPage),
    listAuthorArticles: vi.fn(async () => emptyPage),
    listAuthorPublishedArticles: vi.fn(async () => emptyPage),
    listPublicArticles: vi.fn(async () => emptyPage),
    updateArticle: vi.fn(async () => ({ ...draftArticle, status: 'published' })),
    ...overrides,
  }
}

describe('article service rules', () => {
  it('uses the public repository path for public article lists', async () => {
    const repository = createRepository()
    const service = createArticleService(repository)

    await service.listPublicArticles({ page: 1, pageSize: 20 })

    expect(repository.listPublicArticles).toHaveBeenCalledWith({ page: 1, pageSize: 20 })
    expect(repository.listAdminArticles).not.toHaveBeenCalled()
  })

  it('blocks authors from reading another author article', async () => {
    const repository = createRepository({
      getArticleOwnerId: vi.fn(async () => 99),
    })
    const service = createArticleService(repository)

    await expect(service.getMyArticleDetail(author, 10)).rejects.toMatchObject({
      status: 403,
      message: '不能访问其他作者的文章',
    } satisfies Partial<ApiError>)
  })

  it('allows admins to update any article', async () => {
    const repository = createRepository()
    const service = createArticleService(repository)
    const payload: ArticleFormPayload = {
      status: 'draft',
      title: 'Admin edit',
    }

    await service.updateAdminArticle(admin, 10, payload)

    expect(repository.updateArticle).toHaveBeenCalledWith(10, payload, {
      publishTime: null,
    })
  })

  it('sets publish time when a draft becomes published', async () => {
    const repository = createRepository()
    const service = createArticleService(repository, () => new Date('2026-05-17T01:00:00.000Z'))
    const payload: ArticleFormPayload = {
      status: 'published',
      title: 'Published',
      contentMarkdown: '# Published',
      categoryIds: [1],
      tagIds: [],
    }

    await service.updateMyArticle(author, 10, payload)

    expect(repository.updateArticle).toHaveBeenCalledWith(10, payload, {
      publishTime: '2026-05-17T01:00:00.000Z',
    })
  })

  it('returns not found when an article disappears during author update', async () => {
    const repository = createRepository({
      updateArticle: vi.fn(async () => null),
    })
    const service = createArticleService(repository)
    const payload: ArticleFormPayload = {
      status: 'draft',
      title: 'Still editing',
    }

    await expect(service.updateMyArticle(author, 10, payload)).rejects.toMatchObject({
      status: 404,
      message: '文章不存在',
    })
    expect(repository.updateArticle).toHaveBeenCalledWith(10, payload, {
      publishTime: null,
    })
  })

  it('returns not found when an article disappears during admin update', async () => {
    const repository = createRepository({
      updateArticle: vi.fn(async () => null),
    })
    const service = createArticleService(repository)
    const payload: ArticleFormPayload = {
      status: 'draft',
      title: 'Admin edit',
    }

    await expect(service.updateAdminArticle(admin, 10, payload)).rejects.toMatchObject({
      status: 404,
      message: '文章不存在',
    })
    expect(repository.updateArticle).toHaveBeenCalledWith(10, payload, {
      publishTime: null,
    })
  })

  it('returns not found when an admin deletes a missing article', async () => {
    const repository = createRepository({
      deleteArticle: vi.fn(async () => false),
    })
    const service = createArticleService(repository)

    await expect(service.deleteAdminArticle(admin, 404)).rejects.toMatchObject({
      status: 404,
      message: '文章不存在',
    })
  })

  it('returns not found when an article disappears during author delete', async () => {
    const repository = createRepository({
      deleteArticle: vi.fn(async () => false),
    })
    const service = createArticleService(repository)

    await expect(service.deleteMyArticle(author, 10)).rejects.toMatchObject({
      status: 404,
      message: '文章不存在',
    })
  })
})
