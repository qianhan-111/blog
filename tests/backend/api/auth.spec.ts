// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { CurrentUser, UserProfile } from '../../../src/server/types'
import adminLoginHandler from '../../../api/admin/auth/login'
import adminLogoutHandler from '../../../api/admin/auth/logout'
import adminProfileHandler from '../../../api/admin/auth/profile'
import loginHandler from '../../../api/auth/login'
import logoutHandler from '../../../api/auth/logout'
import profileHandler from '../../../api/auth/profile'
import registerHandler from '../../../api/auth/register'
import { createMockRequest, createMockResponse, readJsonResponse } from './test-utils'

const authMocks = vi.hoisted(() => ({
  getAdminProfile: vi.fn(),
  getCurrentUserFromRequest: vi.fn(),
  getUserProfile: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  registerAuthor: vi.fn(),
  updateUserProfile: vi.fn(),
}))

vi.mock('../../../src/server/services/auth-service', () => ({
  authService: authMocks,
}))

const authorUser: CurrentUser = {
  userId: 7,
  role: 'author',
  username: 'author_demo',
  email: 'author@example.com',
  nickname: 'Author',
  status: 'enabled',
}

const authorProfile: UserProfile = {
  id: 7,
  username: 'author_demo',
  email: 'author@example.com',
  nickname: 'Author',
  avatarUrl: '',
  bio: '',
  role: 'author',
  status: 'enabled',
  createdAt: '2026-05-17T00:00:00.000Z',
  updatedAt: '2026-05-17T00:00:00.000Z',
}

describe('auth API endpoints', () => {
  beforeEach(() => {
    Object.values(authMocks).forEach((mock) => mock.mockReset())
    authMocks.logout.mockReturnValue(null)
  })

  it('registers an author and returns a token payload', async () => {
    authMocks.registerAuthor.mockResolvedValue({
      token: 'author-token',
      expiresAt: '2026-05-18T00:00:00.000Z',
    })
    const response = createMockResponse()

    await registerHandler(createMockRequest({
      method: 'POST',
      body: {
        username: 'author_demo',
        email: 'author@example.com',
        password: 'Author123456!',
        confirmPassword: 'Author123456!',
      },
    }), response)

    expect(response.statusCode).toBe(200)
    expect(readJsonResponse(response)).toMatchObject({
      code: 0,
      data: {
        token: 'author-token',
      },
    })
  })

  it('returns 400 for invalid register payloads before calling the auth service', async () => {
    const response = createMockResponse()

    await registerHandler(createMockRequest({
      method: 'POST',
      body: {
        username: 'a',
        email: 'bad-email',
        password: '123',
        confirmPassword: '456',
      },
    }), response)

    expect(response.statusCode).toBe(400)
    expect(readJsonResponse(response)).toMatchObject({
      code: 400,
      data: null,
    })
    expect(authMocks.registerAuthor).not.toHaveBeenCalled()
  })

  it('logs in authors by username or email', async () => {
    authMocks.login.mockResolvedValue({
      token: 'author-token',
      expiresAt: '2026-05-18T00:00:00.000Z',
    })
    const response = createMockResponse()

    await loginHandler(createMockRequest({
      method: 'POST',
      body: {
        account: 'author@example.com',
        password: 'Author123456!',
      },
    }), response)

    expect(authMocks.login).toHaveBeenCalledWith({
      account: 'author@example.com',
      password: 'Author123456!',
    }, 'author')
    expect(readJsonResponse(response).data).toMatchObject({
      token: 'author-token',
    })
  })

  it('loads and updates the current author profile', async () => {
    authMocks.getCurrentUserFromRequest.mockResolvedValue(authorUser)
    authMocks.getUserProfile.mockResolvedValue(authorProfile)
    authMocks.updateUserProfile.mockResolvedValue({
      ...authorProfile,
      nickname: 'Updated',
    })
    const getResponse = createMockResponse()
    const putResponse = createMockResponse()

    await profileHandler(createMockRequest({
      method: 'GET',
      headers: { authorization: 'Bearer author-token' },
    }), getResponse)
    await profileHandler(createMockRequest({
      method: 'PUT',
      headers: { authorization: 'Bearer author-token' },
      body: {
        nickname: 'Updated',
        avatarUrl: '',
        bio: '',
      },
    }), putResponse)

    expect(authMocks.getCurrentUserFromRequest).toHaveBeenCalledWith(expect.anything(), 'author')
    expect(readJsonResponse(getResponse).data).toMatchObject({ username: 'author_demo' })
    expect(readJsonResponse(putResponse).data).toMatchObject({ nickname: 'Updated' })
  })

  it('logs in admins only through the admin login endpoint', async () => {
    authMocks.login.mockResolvedValue({
      token: 'admin-token',
      expiresAt: '2026-05-18T00:00:00.000Z',
    })
    const response = createMockResponse()

    await adminLoginHandler(createMockRequest({
      method: 'POST',
      body: {
        account: 'admin',
        password: 'Admin123456!',
      },
    }), response)

    expect(authMocks.login).toHaveBeenCalledWith({
      account: 'admin',
      password: 'Admin123456!',
    }, 'admin')
    expect(readJsonResponse(response).data).toMatchObject({ token: 'admin-token' })
  })

  it('loads the admin profile from an admin token', async () => {
    authMocks.getCurrentUserFromRequest.mockResolvedValue({
      ...authorUser,
      role: 'admin',
      userId: 1,
      username: 'admin',
    })
    authMocks.getAdminProfile.mockResolvedValue({
      id: 1,
      username: 'admin',
      nickname: 'Admin',
    })
    const response = createMockResponse()

    await adminProfileHandler(createMockRequest({
      method: 'GET',
      headers: { authorization: 'Bearer admin-token' },
    }), response)

    expect(authMocks.getCurrentUserFromRequest).toHaveBeenCalledWith(expect.anything(), 'admin')
    expect(readJsonResponse(response).data).toEqual({
      id: 1,
      username: 'admin',
      nickname: 'Admin',
    })
  })

  it('returns null from logout endpoints', async () => {
    const authorResponse = createMockResponse()
    const adminResponse = createMockResponse()

    await logoutHandler(createMockRequest({ method: 'POST' }), authorResponse)
    await adminLogoutHandler(createMockRequest({ method: 'POST' }), adminResponse)

    expect(readJsonResponse(authorResponse).data).toBeNull()
    expect(readJsonResponse(adminResponse).data).toBeNull()
  })
})
