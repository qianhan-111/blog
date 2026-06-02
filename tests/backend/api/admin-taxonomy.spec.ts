// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import adminCategoryDetailHandler from '../../../api/admin/categories/[id]'
import adminCategoriesHandler from '../../../api/admin/categories/index'
import adminTagDetailHandler from '../../../api/admin/tags/[id]'
import adminTagsHandler from '../../../api/admin/tags/index'
import { ApiError } from '../../../src/server/errors'
import type { CurrentUser } from '../../../src/server/types'
import { createMockRequest, createMockResponse, readJsonResponse } from './test-utils'

const authMocks = vi.hoisted(() => ({
  getCurrentUserFromRequest: vi.fn(),
}))

const taxonomyMocks = vi.hoisted(() => ({
  createCategory: vi.fn(),
  createTag: vi.fn(),
  deleteCategory: vi.fn(),
  deleteTag: vi.fn(),
  updateCategory: vi.fn(),
  updateTag: vi.fn(),
}))

vi.mock('../../../src/server/services/auth-service', () => ({
  authService: authMocks,
}))

vi.mock('../../../src/server/services/taxonomy-service', () => ({
  taxonomyService: taxonomyMocks,
}))

const adminUser: CurrentUser = {
  userId: 1,
  role: 'admin',
  username: 'admin',
  email: 'admin@example.com',
  nickname: 'Admin',
  status: 'enabled',
}

describe('admin taxonomy API endpoints', () => {
  beforeEach(() => {
    Object.values(authMocks).forEach((mock) => mock.mockReset())
    Object.values(taxonomyMocks).forEach((mock) => mock.mockReset())
    authMocks.getCurrentUserFromRequest.mockResolvedValue(adminUser)
  })

  it('creates, updates, and deletes categories', async () => {
    taxonomyMocks.createCategory.mockResolvedValue({ id: 1, name: 'Vue 3' })
    taxonomyMocks.updateCategory.mockResolvedValue({ id: 1, name: 'Vue 3 Updated' })
    taxonomyMocks.deleteCategory.mockResolvedValue(null)
    const createResponse = createMockResponse()
    const updateResponse = createMockResponse()
    const deleteResponse = createMockResponse()

    await adminCategoriesHandler(createMockRequest({
      method: 'POST',
      body: { name: 'Vue 3', description: 'Vue articles' },
    }), createResponse)
    await adminCategoryDetailHandler(createMockRequest({
      method: 'PUT',
      query: { id: '1' },
      body: { name: 'Vue 3 Updated', description: 'Updated' },
    }), updateResponse)
    await adminCategoryDetailHandler(createMockRequest({
      method: 'DELETE',
      query: { id: '1' },
    }), deleteResponse)

    expect(taxonomyMocks.createCategory).toHaveBeenCalledWith(adminUser, {
      name: 'Vue 3',
      description: 'Vue articles',
    })
    expect(taxonomyMocks.updateCategory).toHaveBeenCalledWith(adminUser, 1, {
      name: 'Vue 3 Updated',
      description: 'Updated',
    })
    expect(taxonomyMocks.deleteCategory).toHaveBeenCalledWith(adminUser, 1)
    expect(readJsonResponse(deleteResponse).data).toBeNull()
  })

  it('creates, updates, and deletes tags', async () => {
    taxonomyMocks.createTag.mockResolvedValue({ id: 2, name: 'Vite' })
    taxonomyMocks.updateTag.mockResolvedValue({ id: 2, name: 'Vite Updated' })
    taxonomyMocks.deleteTag.mockResolvedValue(null)
    const createResponse = createMockResponse()
    const updateResponse = createMockResponse()
    const deleteResponse = createMockResponse()

    await adminTagsHandler(createMockRequest({
      method: 'POST',
      body: { name: 'Vite' },
    }), createResponse)
    await adminTagDetailHandler(createMockRequest({
      method: 'PUT',
      query: { id: '2' },
      body: { name: 'Vite Updated' },
    }), updateResponse)
    await adminTagDetailHandler(createMockRequest({
      method: 'DELETE',
      query: { id: '2' },
    }), deleteResponse)

    expect(taxonomyMocks.createTag).toHaveBeenCalledWith(adminUser, { name: 'Vite' })
    expect(taxonomyMocks.updateTag).toHaveBeenCalledWith(adminUser, 2, { name: 'Vite Updated' })
    expect(taxonomyMocks.deleteTag).toHaveBeenCalledWith(adminUser, 2)
    expect(readJsonResponse(deleteResponse).data).toBeNull()
  })

  it('returns 409 when deleting referenced taxonomy records', async () => {
    taxonomyMocks.deleteCategory.mockRejectedValue(new ApiError(409, '分类已被文章引用，不能删除'))
    const response = createMockResponse()

    await adminCategoryDetailHandler(createMockRequest({
      method: 'DELETE',
      query: { id: '1' },
    }), response)

    expect(response.statusCode).toBe(409)
    expect(readJsonResponse(response).message).toBe('分类已被文章引用，不能删除')
  })
})
