// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import apiHandler from '../../../api/[...path]'
import { ApiError } from '../../../src/server/errors'
import type { CurrentUser } from '../../../src/server/types'
import { createApiRequest, createMockResponse, readJsonResponse } from './test-utils'

const authMocks = vi.hoisted(() => ({
  getCurrentUserFromRequest: vi.fn(),
}))

const articleMocks = vi.hoisted(() => ({
  deleteAdminArticle: vi.fn(),
  getAdminArticleDetail: vi.fn(),
  listAdminArticles: vi.fn(),
  updateAdminArticle: vi.fn(),
}))

vi.mock('../../../src/server/services/auth-service', () => ({
  authService: authMocks,
}))

vi.mock('../../../src/server/services/article-service', () => ({
  articleService: articleMocks,
}))

const adminUser: CurrentUser = {
  userId: 1,
  role: 'admin',
  username: 'admin',
  email: 'admin@example.com',
  nickname: 'Admin',
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

describe('admin article API endpoints', () => {
  beforeEach(() => {
    Object.values(authMocks).forEach((mock) => mock.mockReset())
    Object.values(articleMocks).forEach((mock) => mock.mockReset())
    authMocks.getCurrentUserFromRequest.mockResolvedValue(adminUser)
  })

  it('requires an admin token', async () => {
    authMocks.getCurrentUserFromRequest.mockRejectedValue(new ApiError(403, '没有访问权限'))
    const response = createMockResponse()

    await apiHandler(createApiRequest('/api/admin/articles', { method: 'GET' }), response)

    expect(authMocks.getCurrentUserFromRequest).toHaveBeenCalledWith(expect.anything(), 'admin')
    expect(response.statusCode).toBe(403)
  })

  it('lists admin articles with parsed filters', async () => {
    articleMocks.listAdminArticles.mockResolvedValue(articlePage)
    const response = createMockResponse()

    await apiHandler(createApiRequest('/api/admin/articles', {
      method: 'GET',
      query: {
        page: '2',
        pageSize: '10',
        keyword: 'vue',
        authorId: '7',
        status: 'published',
      },
    }), response)

    expect(articleMocks.listAdminArticles).toHaveBeenCalledWith(adminUser, {
      page: 2,
      pageSize: 10,
      keyword: 'vue',
      categoryIds: [],
      tagIds: [],
      authorId: 7,
      status: 'published',
    })
    expect(readJsonResponse(response).data).toEqual(articlePage)
  })

  it('lets admins view, update, and delete any article', async () => {
    articleMocks.getAdminArticleDetail.mockResolvedValue({ id: 10, title: 'Article' })
    articleMocks.updateAdminArticle.mockResolvedValue({ id: 10, title: 'Updated' })
    articleMocks.deleteAdminArticle.mockResolvedValue(null)
    const getResponse = createMockResponse()
    const putResponse = createMockResponse()
    const deleteResponse = createMockResponse()

    await apiHandler(createApiRequest('/api/admin/articles/10', {
      method: 'GET',
    }), getResponse)
    await apiHandler(createApiRequest('/api/admin/articles/10', {
      method: 'PUT',
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
    await apiHandler(createApiRequest('/api/admin/articles/10', {
      method: 'DELETE',
    }), deleteResponse)

    expect(articleMocks.getAdminArticleDetail).toHaveBeenCalledWith(adminUser, 10)
    expect(articleMocks.updateAdminArticle).toHaveBeenCalledWith(adminUser, 10, {
      status: 'published',
      title: 'Updated',
      contentMarkdown: '# Updated',
      categoryIds: [1],
      tagIds: [],
      summary: '',
      coverUrl: '',
    })
    expect(articleMocks.deleteAdminArticle).toHaveBeenCalledWith(adminUser, 10)
    expect(readJsonResponse(getResponse).data).toEqual({ id: 10, title: 'Article' })
    expect(readJsonResponse(putResponse).data).toEqual({ id: 10, title: 'Updated' })
    expect(readJsonResponse(deleteResponse).data).toBeNull()
  })
})
