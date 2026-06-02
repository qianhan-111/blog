// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import articleDetailHandler from '../../../api/articles/[id]'
import articlePrevNextHandler from '../../../api/articles/[id]/prev-next'
import articleListHandler from '../../../api/articles/index'
import authorArticlesHandler from '../../../api/authors/[id]/articles'
import authorProfileHandler from '../../../api/authors/[id]'
import categoriesHandler from '../../../api/categories'
import healthHandler from '../../../api/health'
import tagsHandler from '../../../api/tags'
import { createMockRequest, createMockResponse, readJsonResponse } from './test-utils'

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

    await categoriesHandler(createMockRequest({ method: 'GET' }), categoryResponse)
    await tagsHandler(createMockRequest({ method: 'GET' }), tagResponse)

    expect(readJsonResponse(categoryResponse).data).toEqual([{ id: 1, name: 'Vue 3' }])
    expect(readJsonResponse(tagResponse).data).toEqual([{ id: 2, name: 'Vite' }])
  })

  it('only allows GET requests for health checks', async () => {
    const getResponse = createMockResponse()
    const postResponse = createMockResponse()

    await healthHandler(createMockRequest({ method: 'GET' }), getResponse)
    await healthHandler(createMockRequest({ method: 'POST' }), postResponse)

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

    await articleListHandler(createMockRequest({
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

    await articleDetailHandler(createMockRequest({
      method: 'GET',
      url: '/api/articles/7',
    }), detailResponse)
    await articlePrevNextHandler(createMockRequest({
      method: 'GET',
      query: { id: '7' },
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

    await authorProfileHandler(createMockRequest({
      method: 'GET',
      query: { id: '7' },
    }), profileResponse)
    await authorArticlesHandler(createMockRequest({
      method: 'GET',
      query: {
        id: '7',
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
