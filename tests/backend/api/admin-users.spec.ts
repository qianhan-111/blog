// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import adminUserDetailHandler from '../../../api/admin/users/[id]'
import adminUserStatusHandler from '../../../api/admin/users/[id]/status'
import adminUsersHandler from '../../../api/admin/users/index'
import { ApiError } from '../../../src/server/errors'
import type { CurrentUser } from '../../../src/server/types'
import { createMockRequest, createMockResponse, readJsonResponse } from './test-utils'

const authMocks = vi.hoisted(() => ({
  getCurrentUserFromRequest: vi.fn(),
}))

const userMocks = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  getUserDetail: vi.fn(),
  listUsers: vi.fn(),
  updateUserStatus: vi.fn(),
}))

vi.mock('../../../src/server/services/auth-service', () => ({
  authService: authMocks,
}))

vi.mock('../../../src/server/services/user-service', () => ({
  userService: userMocks,
}))

const adminUser: CurrentUser = {
  userId: 1,
  role: 'admin',
  username: 'admin',
  email: 'admin@example.com',
  nickname: 'Admin',
  status: 'enabled',
}

const userPage = {
  items: [],
  meta: {
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 0,
  },
}

describe('admin user API endpoints', () => {
  beforeEach(() => {
    Object.values(authMocks).forEach((mock) => mock.mockReset())
    Object.values(userMocks).forEach((mock) => mock.mockReset())
    authMocks.getCurrentUserFromRequest.mockResolvedValue(adminUser)
  })

  it('lists users with parsed filters', async () => {
    userMocks.listUsers.mockResolvedValue(userPage)
    const response = createMockResponse()

    await adminUsersHandler(createMockRequest({
      method: 'GET',
      query: {
        page: '2',
        pageSize: '10',
        keyword: 'author',
        status: 'enabled',
      },
    }), response)

    expect(userMocks.listUsers).toHaveBeenCalledWith(adminUser, {
      page: 2,
      pageSize: 10,
      keyword: 'author',
      status: 'enabled',
    })
    expect(readJsonResponse(response).data).toEqual(userPage)
  })

  it('gets, updates status for, and deletes users', async () => {
    userMocks.getUserDetail.mockResolvedValue({ id: 7, username: 'author_demo' })
    userMocks.updateUserStatus.mockResolvedValue({ id: 7, status: 'disabled' })
    userMocks.deleteUser.mockResolvedValue(null)
    const detailResponse = createMockResponse()
    const statusResponse = createMockResponse()
    const deleteResponse = createMockResponse()

    await adminUserDetailHandler(createMockRequest({
      method: 'GET',
      query: { id: '7' },
    }), detailResponse)
    await adminUserStatusHandler(createMockRequest({
      method: 'PATCH',
      query: { id: '7' },
      body: { status: 'disabled' },
    }), statusResponse)
    await adminUserDetailHandler(createMockRequest({
      method: 'DELETE',
      query: { id: '7' },
    }), deleteResponse)

    expect(userMocks.getUserDetail).toHaveBeenCalledWith(adminUser, 7)
    expect(userMocks.updateUserStatus).toHaveBeenCalledWith(adminUser, 7, 'disabled')
    expect(userMocks.deleteUser).toHaveBeenCalledWith(adminUser, 7)
    expect(readJsonResponse(detailResponse).data).toEqual({ id: 7, username: 'author_demo' })
    expect(readJsonResponse(statusResponse).data).toEqual({ id: 7, status: 'disabled' })
    expect(readJsonResponse(deleteResponse).data).toBeNull()
  })

  it('returns 409 when deleting a user with articles', async () => {
    userMocks.deleteUser.mockRejectedValue(new ApiError(409, '用户仍有关联文章，不能删除'))
    const response = createMockResponse()

    await adminUserDetailHandler(createMockRequest({
      method: 'DELETE',
      query: { id: '7' },
    }), response)

    expect(response.statusCode).toBe(409)
    expect(readJsonResponse(response).message).toBe('用户仍有关联文章，不能删除')
  })
})
