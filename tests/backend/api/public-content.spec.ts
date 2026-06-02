// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import apiHandler from '../../../api/[...path]'
import { createApiRequest, createMockResponse, readJsonResponse } from './test-utils'

const articleMocks = vi.hoisted(() => ({
  getArticlePrevNext: vi.fn(),
  getPublicArticleDetail: vi.fn(),
  listAuthorPublishedArticles: vi.fn(),
  listPublicArticles: vi.fn(),
}))

const taxonomyMocks = vi.hoisted(() => ({
  listCategories: vi.fn(),
  listTags: vi.fn(),
}))

const userRepositoryMocks = vi.hoisted(() => ({
  findPublicAuthorById: vi.fn(),
}))

vi.mock('../../../src/server/services/article-service', () => ({
  articleService: articleMocks,
}))

vi.mock('../../../src/server/services/taxonomy-service', () => ({
  taxonomyService: taxonomyMocks,
}))

vi.mock('../../../src/server/repositories/users', () => userRepositoryMocks)

const articlePage = {
  items: [],
  meta: {
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 0,
  },
}

describe('public content API endpoints', () => {
  beforeEach(() => {
    Object.values(articleMocks).forEach((mock) => mock.mockReset())
    Object.values(taxonomyMocks).forEach((mock) => mock.mockReset())
    Object.values(userRepositoryMocks).forEach((mock) => mock.mockReset())
  })

  it('returns public categories and tags', async () => {
    taxonomyMocks.listCategories.mockResolvedValue([{ id: 1, name: 'Vue 3' }])
    taxonomyMocks.listTags.mockResolvedValue([{ id: 2, name: 'Vite' }])
    const categoryResponse = createMockResponse()
    const tagResponse = createMockResponse()

    await apiHandler(createApiRequest('/api/categories', { method: 'GET' }), categoryResponse)
    await apiHandler(createApiRequest('/api/tags', { method: 'GET' }), tagResponse)

    expect(readJsonResponse(categoryResponse).data).toEqual([{ id: 1, name: 'Vue 3' }])
    expect(readJsonResponse(tagResponse).data).toEqual([{ id: 2, name: 'Vite' }])
  })

  it('only allows GET requests for health checks', async () => {
    const getResponse = createMockResponse()
    const postResponse = createMockResponse()

    await apiHandler(createApiRequest('/api/health', { method: 'GET' }), getResponse)
    await apiHandler(createApiRequest('/api/health', { method: 'POST' }), postResponse)

    expect(readJsonResponse(getResponse).data).toEqual({ status: 'ok' })
    expect(postResponse.statusCode).toBe(405)
    expect(readJsonResponse(postResponse)).toMatchObject({
      code: 405,
      message: '请求方法不支持',
    })
  })

  it('lists public articles with parsed filters', async () => {
    articleMocks.listPublicArticles.mockResolvedValue(articlePage)
    const response = createMockResponse()

    await apiHandler(createApiRequest('/api/articles', {
      method: 'GET',
      query: {
        page: '2',
        pageSize: '10',
        keyword: 'vue',
        categoryIds: '1,2',
        tagIds: ['3', '4'],
        sortField: 'publishTime',
        sortOrder: 'desc',
      },
    }), response)

    expect(articleMocks.listPublicArticles).toHaveBeenCalledWith({
      page: 2,
      pageSize: 10,
      keyword: 'vue',
      categoryIds: [1, 2],
      tagIds: [3, 4],
      sortField: 'publishTime',
      sortOrder: 'desc',
    })
    expect(readJsonResponse(response).data).toEqual(articlePage)
  })

  it('returns public article detail and prev-next data', async () => {
    articleMocks.getPublicArticleDetail.mockResolvedValue({ id: 7, title: 'Article' })
    articleMocks.getArticlePrevNext.mockResolvedValue({
      prev: { id: 6, title: 'Prev' },
      next: null,
    })
    const detailResponse = createMockResponse()
    const prevNextResponse = createMockResponse()

    await apiHandler(createApiRequest('/api/articles/7', {
      method: 'GET',
    }), detailResponse)
    await apiHandler(createApiRequest('/api/articles/7/prev-next', {
      method: 'GET',
    }), prevNextResponse)

    expect(articleMocks.getPublicArticleDetail).toHaveBeenCalledWith(7)
    expect(articleMocks.getArticlePrevNext).toHaveBeenCalledWith(7)
    expect(readJsonResponse(detailResponse).data).toEqual({ id: 7, title: 'Article' })
    expect(readJsonResponse(prevNextResponse).data).toEqual({
      prev: { id: 6, title: 'Prev' },
      next: null,
    })
  })

  it('returns author profile and published author articles', async () => {
    userRepositoryMocks.findPublicAuthorById.mockResolvedValue({
      id: 7,
      username: 'author_demo',
      nickname: 'Author',
      avatarUrl: '',
      bio: '',
    })
    articleMocks.listAuthorPublishedArticles.mockResolvedValue(articlePage)
    const profileResponse = createMockResponse()
    const articlesResponse = createMockResponse()

    await apiHandler(createApiRequest('/api/authors/7', {
      method: 'GET',
    }), profileResponse)
    await apiHandler(createApiRequest('/api/authors/7/articles', {
      method: 'GET',
      query: {
        page: '1',
        pageSize: '20',
      },
    }), articlesResponse)

    expect(userRepositoryMocks.findPublicAuthorById).toHaveBeenCalledWith(7)
    expect(articleMocks.listAuthorPublishedArticles).toHaveBeenCalledWith(7, {
      page: 1,
      pageSize: 20,
      keyword: '',
      categoryIds: [],
      tagIds: [],
    })
    expect(readJsonResponse(profileResponse).data).toMatchObject({
      username: 'author_demo',
    })
    expect(readJsonResponse(articlesResponse).data).toEqual(articlePage)
  })
})
