// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import authorArticleDetailHandler from '../../../api/author/articles/[id]'
import authorArticlesHandler from '../../../api/author/articles/index'
import { ApiError } from '../../../src/server/errors'
import type { CurrentUser } from '../../../src/server/types'
import { createMockRequest, createMockResponse, readJsonResponse } from './test-utils'

const authMocks = vi.hoisted(() => ({
  getCurrentUserFromRequest: vi.fn(),
}))

const articleMocks = vi.hoisted(() => ({
  createMyArticle: vi.fn(),
  deleteMyArticle: vi.fn(),
  getMyArticleDetail: vi.fn(),
  listMyArticles: vi.fn(),
  updateMyArticle: vi.fn(),
}))

vi.mock('../../../src/server/services/auth-service', () => ({
  authService: authMocks,
}))

vi.mock('../../../src/server/services/article-service', () => ({
  articleService: articleMocks,
}))

const authorUser: CurrentUser = {
  userId: 7,
  role: 'author',
  username: 'author_demo',
  email: 'author@example.com',
  nickname: 'Author',
  status: 'enabled',
}

const articlePage = {
  items: [],
  meta: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },
}

describe('author article API endpoints', () => {
  beforeEach(() => {
    Object.values(authMocks).forEach((mock) => mock.mockReset())
    Object.values(articleMocks).forEach((mock) => mock.mockReset())
    authMocks.getCurrentUserFromRequest.mockResolvedValue(authorUser)
  })

  it('returns 401 when the author token is missing', async () => {
    authMocks.getCurrentUserFromRequest.mockRejectedValue(new ApiError(401, '登录已过期，请重新登录'))
    const response = createMockResponse()

    await authorArticlesHandler(createMockRequest({ method: 'GET' }), response)

    expect(response.statusCode).toBe(401)
    expect(readJsonResponse(response)).toMatchObject({
      code: 401,
      message: '登录已过期，请重新登录',
    })
  })

  it('lists only the current author articles with parsed filters', async () => {
    articleMocks.listMyArticles.mockResolvedValue(articlePage)
    const response = createMockResponse()

    await authorArticlesHandler(createMockRequest({
      method: 'GET',
      query: {
        page: '2',
        pageSize: '10',
        keyword: 'draft',
        status: 'draft',
      },
    }), response)

    expect(authMocks.getCurrentUserFromRequest).toHaveBeenCalledWith(expect.anything(), 'author')
    expect(articleMocks.listMyArticles).toHaveBeenCalledWith(authorUser, {
      page: 2,
      pageSize: 10,
      keyword: 'draft',
      categoryIds: [],
      tagIds: [],
      status: 'draft',
    })
    expect(readJsonResponse(response).data).toEqual(articlePage)
  })

  it('creates draft or published articles for the current author', async () => {
    articleMocks.createMyArticle.mockResolvedValue({ id: 10, title: 'Draft' })
    const response = createMockResponse()

    await authorArticlesHandler(createMockRequest({
      method: 'POST',
      body: {
        status: 'draft',
        title: 'Draft',
        summary: '',
        coverUrl: '',
        contentMarkdown: '',
        categoryIds: [],
        tagIds: [],
      },
    }), response)

    expect(articleMocks.createMyArticle).toHaveBeenCalledWith(authorUser, {
      status: 'draft',
      title: 'Draft',
      summary: '',
      coverUrl: '',
      contentMarkdown: '',
      categoryIds: [],
      tagIds: [],
    })
    expect(readJsonResponse(response).data).toEqual({ id: 10, title: 'Draft' })
  })

  it('loads, updates, and deletes current author article detail', async () => {
    articleMocks.getMyArticleDetail.mockResolvedValue({ id: 10, title: 'Article' })
    articleMocks.updateMyArticle.mockResolvedValue({ id: 10, title: 'Updated' })
    articleMocks.deleteMyArticle.mockResolvedValue(null)
    const getResponse = createMockResponse()
    const putResponse = createMockResponse()
    const deleteResponse = createMockResponse()

    await authorArticleDetailHandler(createMockRequest({
      method: 'GET',
      query: { id: '10' },
    }), getResponse)
    await authorArticleDetailHandler(createMockRequest({
      method: 'PUT',
      query: { id: '10' },
      body: {
        status: 'published',
        title: 'Updated',
        contentMarkdown: '# Updated',
        categoryIds: [1],
        tagIds: [],
        summary: '',
        coverUrl: '',
      },
    }), putResponse)
    await authorArticleDetailHandler(createMockRequest({
      method: 'DELETE',
      query: { id: '10' },
    }), deleteResponse)

    expect(articleMocks.getMyArticleDetail).toHaveBeenCalledWith(authorUser, 10)
    expect(articleMocks.updateMyArticle).toHaveBeenCalledWith(authorUser, 10, {
      status: 'published',
      title: 'Updated',
      contentMarkdown: '# Updated',
      categoryIds: [1],
      tagIds: [],
      summary: '',
      coverUrl: '',
    })
    expect(articleMocks.deleteMyArticle).toHaveBeenCalledWith(authorUser, 10)
    expect(readJsonResponse(getResponse).data).toEqual({ id: 10, title: 'Article' })
    expect(readJsonResponse(putResponse).data).toEqual({ id: 10, title: 'Updated' })
    expect(readJsonResponse(deleteResponse).data).toBeNull()
  })
})
