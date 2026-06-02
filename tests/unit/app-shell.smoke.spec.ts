import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { nextTick } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/App.vue'
import { HttpClientError } from '@/api/client'
import {
  getAdminArticleDetail,
  getAdminArticles,
  getMyArticleDetail,
  getMyArticles,
} from '@/api/author-articles'
import { getCategories } from '@/api/categories'
import { getArticleDetail, getArticlePrevNext } from '@/api/public-articles'
import { getTags } from '@/api/tags'
import router from '@/router'
import {
  clearAdminToken,
  clearUserToken,
  setAdminToken,
  setUserToken,
} from '@/utils/auth-storage'
import { getAdminUserDetail, getAdminUsers } from '@/api/users'

vi.mock('@/api/public-articles', () => ({
  getPublicArticles: vi.fn(),
  getArticleDetail: vi.fn(),
  getArticlePrevNext: vi.fn(),
  getAuthorProfile: vi.fn(),
  getAuthorArticles: vi.fn(),
}))

vi.mock('@/api/author-articles', () => ({
  getMyArticles: vi.fn(),
  getMyArticleDetail: vi.fn(),
  createMyArticle: vi.fn(),
  updateMyArticle: vi.fn(),
  deleteMyArticle: vi.fn(),
  getAdminArticles: vi.fn(),
  getAdminArticleDetail: vi.fn(),
  updateAdminArticle: vi.fn(),
  deleteAdminArticle: vi.fn(),
}))

vi.mock('@/api/categories', () => ({
  getCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  deleteCategory: vi.fn(),
}))

vi.mock('@/api/tags', () => ({
  getTags: vi.fn(),
  createTag: vi.fn(),
  updateTag: vi.fn(),
  deleteTag: vi.fn(),
}))

vi.mock('@/api/users', () => ({
  getAdminUsers: vi.fn(),
  getAdminUserDetail: vi.fn(),
  updateAdminUserStatus: vi.fn(),
  deleteAdminUser: vi.fn(),
}))

const getArticleDetailMock = vi.mocked(getArticleDetail)
const getArticlePrevNextMock = vi.mocked(getArticlePrevNext)
const getMyArticlesMock = vi.mocked(getMyArticles)
const getMyArticleDetailMock = vi.mocked(getMyArticleDetail)
const getAdminArticlesMock = vi.mocked(getAdminArticles)
const getAdminArticleDetailMock = vi.mocked(getAdminArticleDetail)
const getCategoriesMock = vi.mocked(getCategories)
const getTagsMock = vi.mocked(getTags)
const getAdminUsersMock = vi.mocked(getAdminUsers)
const getAdminUserDetailMock = vi.mocked(getAdminUserDetail)

describe('App shell', () => {
  beforeEach(async () => {
    clearUserToken()
    clearAdminToken()
    getArticleDetailMock.mockReset()
    getArticlePrevNextMock.mockReset()
    getMyArticlesMock.mockReset()
    getMyArticleDetailMock.mockReset()
    getAdminArticlesMock.mockReset()
    getAdminArticleDetailMock.mockReset()
    getCategoriesMock.mockReset()
    getTagsMock.mockReset()
    getAdminUsersMock.mockReset()
    getAdminUserDetailMock.mockReset()
    router.push('/')
    await router.isReady()
  })

  it('mounts with the router and renders the public home shell', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(document.documentElement.dataset.testSetup).toBe('true')
    expect(wrapper.find('[data-test="route-progress"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="route-transition"]').exists()).toBe(true)
    expect(wrapper.find('.site-header').exists()).toBe(true)
    expect(wrapper.find('[data-test="site-header-search"]').exists()).toBe(true)
    expect(wrapper.find('[data-test="header-primary-nav"]').text()).toContain('首页')
    expect(wrapper.find('[data-test="header-primary-nav"]').text()).toContain('最新')
    expect(wrapper.find('[data-test="header-primary-nav"]').text()).toContain('分类')
    expect(wrapper.find('[data-test="header-primary-nav"]').text()).toContain('标签')
    expect(wrapper.find('[data-test="header-user-nav"]').text()).toContain('登录')
    expect(wrapper.find('[data-test="header-user-nav"]').text()).toContain('注册')
    expect(wrapper.find('[data-test="header-user-nav"]').text()).not.toContain('我的')
    expect(wrapper.find('[data-test="site-header-search"]').text()).toContain('搜索文章')
  })

  it('marks only the matching primary header entry as current on the base home route', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await nextTick()

    const currentLinks = wrapper
      .find('[data-test="header-primary-nav"]')
      .findAll('[aria-current="page"]')
      .map((link) => link.text())

    expect(currentLinks).toEqual(['首页'])
  })

  it('resyncs auth-aware shell links during in-app navigation', async () => {
    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    expect(wrapper.find('[data-test="header-user-nav"]').text()).toContain('登录')
    expect(wrapper.find('[data-test="header-user-nav"]').text()).toContain('注册')
    expect(wrapper.find('[data-test="header-user-nav"]').text()).not.toContain('我的')

    setUserToken('test-user-token')
    await router.push('/login')
    await router.isReady()
    await nextTick()

    expect(wrapper.find('[data-test="header-user-nav"]').text()).toContain('我的')
    expect(wrapper.find('[data-test="header-user-nav"]').text()).not.toContain('注册')

    clearUserToken()
    await router.push('/register')
    await router.isReady()
    await nextTick()

    expect(wrapper.find('[data-test="header-user-nav"]').text()).toContain('登录')
    expect(wrapper.find('[data-test="header-user-nav"]').text()).toContain('注册')
    expect(wrapper.find('[data-test="header-user-nav"]').text()).not.toContain('我的')
  })

  it('mounts the public article detail route inside the app shell', async () => {
    getArticleDetailMock.mockResolvedValue({
      id: 21,
      authorId: 7,
      author: {
        id: 7,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Smoke Article',
      summary: 'Route-level smoke test',
      coverUrl: '/cover.png',
      contentMarkdown: '# Smoke Article',
      status: 'published',
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: [],
      tags: [],
    })
    getArticlePrevNextMock.mockResolvedValue({
      prev: null,
      next: null,
    })

    await router.push('/articles/21')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.find('.site-header').exists()).toBe(true)
    expect(wrapper.text()).toContain('Smoke Article')
    expect(wrapper.find('[data-test="article-right-rail"]').text()).toContain('最近浏览')
  })

  it('shows recovery guidance when the public article detail request fails', async () => {
    getArticleDetailMock.mockRejectedValue(
      new HttpClientError({
        kind: 'timeout',
        message: '请求超时，请稍后重试',
        retryable: true,
        shouldReport: true,
      }),
    )
    getArticlePrevNextMock.mockResolvedValue({
      prev: null,
      next: null,
    })

    await router.push('/articles/21')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')
    expect(wrapper.text()).toContain('重新加载')
  })

  it('mounts the author dashboard route after the author session is present', async () => {
    setUserToken('author-smoke-token')
    await router.push('/writer')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/writer')
    expect(wrapper.text()).toContain('继续你的写作流程')
    expect(wrapper.text()).toContain('我的文章')
    expect(wrapper.text()).toContain('新建文章')
    expect(wrapper.text()).toContain('个人资料')
  })

  it('mounts the admin dashboard route after the admin session is present', async () => {
    setAdminToken('admin-smoke-token')
    await router.push('/admin')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/admin')
    expect(wrapper.text()).toContain('全站治理入口')
    expect(wrapper.text()).toContain('文章管理')
    expect(wrapper.text()).toContain('分类管理')
    expect(wrapper.text()).toContain('用户管理')
  })

  it('mounts the author article list route with loaded items', async () => {
    getMyArticlesMock.mockResolvedValue({
      items: [
        {
          id: 101,
          authorId: 9,
          author: {
            id: 9,
            username: 'writer',
            nickname: 'Writer',
            avatarUrl: '/avatar.png',
          },
          title: 'Smoke Draft',
          summary: 'Route-level author list smoke test',
          coverUrl: '',
          contentMarkdown: 'Body',
          status: 'draft',
          publishTime: '2026-05-12T00:00:00.000Z',
          updatedAt: '2026-05-13T00:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })

    setUserToken('author-list-smoke-token')
    await router.push('/writer/articles')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/writer/articles')
    expect(wrapper.text()).toContain('作者文章列表')
    expect(wrapper.text()).toContain('Smoke Draft')
    expect(wrapper.text()).toContain('编辑')
  })

  it('reloads the author list after applying filters', async () => {
    getMyArticlesMock
      .mockResolvedValueOnce({
        items: [
          {
            id: 101,
            authorId: 9,
            author: {
              id: 9,
              username: 'writer',
              nickname: 'Writer',
              avatarUrl: '/avatar.png',
            },
            title: 'Smoke Draft',
            summary: 'Route-level author list smoke test',
            coverUrl: '',
            contentMarkdown: 'Body',
            status: 'draft',
            publishTime: '2026-05-12T00:00:00.000Z',
            updatedAt: '2026-05-13T00:00:00.000Z',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })
      .mockResolvedValueOnce({
        items: [
          {
            id: 102,
            authorId: 9,
            author: {
              id: 9,
              username: 'writer',
              nickname: 'Writer',
              avatarUrl: '/avatar.png',
            },
            title: 'Filtered Smoke Draft',
            summary: 'Filtered result',
            coverUrl: '',
            contentMarkdown: 'Body',
            status: 'published',
            publishTime: '2026-05-14T00:00:00.000Z',
            updatedAt: '2026-05-14T00:00:00.000Z',
          },
        ],
        meta: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      })

    setUserToken('author-filter-smoke-token')
    await router.push('/writer/articles')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    await wrapper.find('input[type="search"]').setValue('filtered')
    await wrapper.get('button.author-articles-view__action').trigger('click')
    await flushPromises()

    expect(getMyArticlesMock).toHaveBeenLastCalledWith({
      page: 1,
      pageSize: 20,
      keyword: 'filtered',
    })
    expect(wrapper.text()).toContain('Filtered Smoke Draft')
  })

  it('recovers the author editor after an initial detail load failure', async () => {
    getCategoriesMock.mockResolvedValue([])
    getTagsMock.mockResolvedValue([])
    getMyArticleDetailMock
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'timeout',
          message: '请求超时，请稍后重试',
          retryable: true,
          shouldReport: true,
        }),
      )
      .mockResolvedValueOnce({
        id: 101,
        authorId: 9,
        author: {
          id: 9,
          username: 'writer',
          nickname: 'Writer',
          avatarUrl: '/avatar.png',
        },
        title: 'Recovered Draft',
        summary: 'Recovered content',
        coverUrl: '',
        contentMarkdown: 'Body',
        status: 'draft',
        publishTime: '2026-05-12T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
        categories: [],
        tags: [],
      })

    setUserToken('author-editor-error-smoke-token')
    await router.push('/writer/articles/101/edit')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('请求超时，请稍后重试')
    expect(wrapper.text()).toContain('可稍后重试，若持续失败请检查网络连接')

    const retryButton = wrapper.findAll('button').find((button) => button.text() === '重新加载')

    expect(retryButton).toBeDefined()
    await retryButton!.trigger('click')
    await flushPromises()
    await flushPromises()

    expect(wrapper.text()).toContain('保存草稿')
    expect(wrapper.find('input[placeholder="输入文章标题"]').element.getAttribute('value')).toBe('Recovered Draft')
  })

  it('mounts the admin article list route with loaded items', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [
        {
          id: 301,
          authorId: 9,
          author: {
            id: 9,
            username: 'writer',
            nickname: 'Writer',
            avatarUrl: '/avatar.png',
          },
          title: 'Admin Smoke Article',
          summary: 'Route-level admin article smoke test',
          coverUrl: '',
          contentMarkdown: 'Body',
          status: 'draft',
          publishTime: '2026-05-12T00:00:00.000Z',
          updatedAt: '2026-05-13T00:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getCategoriesMock.mockResolvedValue([])
    getTagsMock.mockResolvedValue([])

    setAdminToken('admin-articles-smoke-token')
    await router.push('/admin/articles')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/admin/articles')
    expect(wrapper.text()).toContain('文章管理')
    expect(wrapper.text()).toContain('Admin Smoke Article')
    expect(wrapper.text()).toContain('请选择一篇文章')
  })

  it('loads article detail after clicking view in the admin article list', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [
        {
          id: 301,
          authorId: 9,
          author: {
            id: 9,
            username: 'writer',
            nickname: 'Writer',
            avatarUrl: '/avatar.png',
          },
          title: 'Admin Smoke Article',
          summary: 'Route-level admin article smoke test',
          coverUrl: '',
          contentMarkdown: 'Body',
          status: 'draft',
          publishTime: '2026-05-12T00:00:00.000Z',
          updatedAt: '2026-05-13T00:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock.mockResolvedValue({
      id: 301,
      authorId: 9,
      author: {
        id: 9,
        username: 'writer',
        nickname: 'Writer',
        avatarUrl: '/avatar.png',
      },
      title: 'Admin Smoke Article',
      summary: 'Route-level admin article smoke test',
      coverUrl: '',
      contentMarkdown: 'Body',
      status: 'draft',
      publishTime: '2026-05-12T00:00:00.000Z',
      updatedAt: '2026-05-13T00:00:00.000Z',
      categories: [],
      tags: [],
    })
    getCategoriesMock.mockResolvedValue([])
    getTagsMock.mockResolvedValue([])

    setAdminToken('admin-article-detail-smoke-token')
    await router.push('/admin/articles')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    const viewButton = wrapper.findAll('button').find((button) => button.text() === '查看')

    expect(viewButton).toBeDefined()
    await viewButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('当前文章')
    expect(wrapper.text()).toContain('Admin Smoke Article')
    expect(wrapper.text()).toContain('Route-level admin article smoke test')
  })

  it('keeps the loaded admin article detail visible when a later detail refresh fails', async () => {
    getAdminArticlesMock.mockResolvedValue({
      items: [
        {
          id: 301,
          authorId: 9,
          author: {
            id: 9,
            username: 'writer',
            nickname: 'Writer',
            avatarUrl: '/avatar.png',
          },
          title: 'Admin Smoke Article',
          summary: 'Route-level admin article smoke test',
          coverUrl: '',
          contentMarkdown: 'Body',
          status: 'draft',
          publishTime: '2026-05-12T00:00:00.000Z',
          updatedAt: '2026-05-13T00:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 20,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminArticleDetailMock
      .mockResolvedValueOnce({
        id: 301,
        authorId: 9,
        author: {
          id: 9,
          username: 'writer',
          nickname: 'Writer',
          avatarUrl: '/avatar.png',
        },
        title: 'Admin Smoke Article',
        summary: 'Route-level admin article smoke test',
        coverUrl: '',
        contentMarkdown: 'Body',
        status: 'draft',
        publishTime: '2026-05-12T00:00:00.000Z',
        updatedAt: '2026-05-13T00:00:00.000Z',
        categories: [],
        tags: [],
      })
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'network',
          message: '网络连接失败，请检查网络或后端服务',
          retryable: true,
          shouldReport: true,
        }),
      )
    getCategoriesMock.mockResolvedValue([])
    getTagsMock.mockResolvedValue([])

    setAdminToken('admin-article-detail-error-smoke-token')
    await router.push('/admin/articles')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    const viewButtons = wrapper.findAll('button').filter((button) => button.text() === '查看')
    expect(viewButtons.length).toBeGreaterThan(0)

    await viewButtons[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Admin Smoke Article')

    await viewButtons[0].trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Admin Smoke Article')
    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')
  })

  it('mounts the admin categories route with loaded items', async () => {
    getCategoriesMock.mockResolvedValue([
      {
        id: 11,
        name: 'Vue',
        description: 'Vue articles',
      },
    ])

    setAdminToken('admin-categories-smoke-token')
    await router.push('/admin/categories')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/admin/categories')
    expect(wrapper.text()).toContain('分类管理')
    expect(wrapper.text()).toContain('Vue')
    expect(wrapper.text()).toContain('新增分类')
  })

  it('recovers the admin categories route after an initial load failure', async () => {
    getCategoriesMock
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'network',
          message: '网络连接失败，请检查网络或后端服务',
          retryable: true,
          shouldReport: true,
        }),
      )
      .mockResolvedValueOnce([
        {
          id: 11,
          name: 'Vue',
          description: 'Vue articles',
        },
      ])

    setAdminToken('admin-categories-error-smoke-token')
    await router.push('/admin/categories')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')

    const retryButton = wrapper.findAll('button').find((button) => button.text() === '重新加载')

    expect(retryButton).toBeDefined()
    await retryButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('Vue')
    expect(wrapper.text()).toContain('新增分类')
  })

  it('mounts the admin users route with loaded items', async () => {
    getAdminUsersMock.mockResolvedValue({
      items: [
        {
          id: 7,
          username: 'author-7',
          email: 'author7@example.com',
          nickname: 'Author Seven',
          avatarUrl: '/avatar.png',
          bio: 'Bio',
          role: 'author',
          status: 'enabled',
          createdAt: '2026-05-10T00:00:00.000Z',
          updatedAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })

    setAdminToken('admin-users-smoke-token')
    await router.push('/admin/users')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/admin/users')
    expect(wrapper.text()).toContain('用户管理')
    expect(wrapper.text()).toContain('Author Seven')
    expect(wrapper.text()).toContain('请选择一个用户')
  })

  it('loads user detail after clicking view in the admin users list', async () => {
    getAdminUsersMock.mockResolvedValue({
      items: [
        {
          id: 7,
          username: 'author-7',
          email: 'author7@example.com',
          nickname: 'Author Seven',
          avatarUrl: '/avatar.png',
          bio: 'Bio',
          role: 'author',
          status: 'enabled',
          createdAt: '2026-05-10T00:00:00.000Z',
          updatedAt: '2026-05-12T00:00:00.000Z',
        },
      ],
      meta: {
        page: 1,
        pageSize: 10,
        total: 1,
        totalPages: 1,
      },
    })
    getAdminUserDetailMock.mockResolvedValue({
      id: 7,
      username: 'author-7',
      email: 'author7@example.com',
      nickname: 'Author Seven',
      avatarUrl: '/avatar.png',
      bio: 'Bio',
      role: 'author',
      status: 'enabled',
      createdAt: '2026-05-10T00:00:00.000Z',
      updatedAt: '2026-05-12T00:00:00.000Z',
    })

    setAdminToken('admin-user-detail-smoke-token')
    await router.push('/admin/users')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    const viewButton = wrapper.findAll('button').find((button) => button.text() === '查看')

    expect(viewButton).toBeDefined()
    await viewButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('用户详情')
    expect(wrapper.text()).toContain('author7@example.com')
    expect(wrapper.text()).toContain('Bio')
  })

  it('shows recovery guidance when the admin users list initial load fails', async () => {
    getAdminUsersMock.mockRejectedValue(
      new HttpClientError({
        kind: 'network',
        message: '网络连接失败，请检查网络或后端服务',
        retryable: true,
        shouldReport: true,
      }),
    )

    setAdminToken('admin-users-error-smoke-token')
    await router.push('/admin/users')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')
    expect(wrapper.text()).toContain('重新加载')
  })

  it('recovers the admin tags route after an initial load failure', async () => {
    getTagsMock
      .mockRejectedValueOnce(
        new HttpClientError({
          kind: 'network',
          message: '网络连接失败，请检查网络或后端服务',
          retryable: true,
          shouldReport: true,
        }),
      )
      .mockResolvedValueOnce([
        {
          id: 21,
          name: 'Pinia',
          createdAt: '2026-05-12T00:00:00.000Z',
        },
      ])

    setAdminToken('admin-tags-error-smoke-token')
    await router.push('/admin/tags')
    await router.isReady()

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('网络连接失败，请检查网络或后端服务')
    expect(wrapper.text()).toContain('请检查网络或服务状态后重试')

    const retryButton = wrapper.findAll('button').find((button) => button.text() === '重新加载')

    expect(retryButton).toBeDefined()
    await retryButton!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('标签管理')
    expect(wrapper.text()).toContain('Pinia')
    expect(wrapper.text()).toContain('新增标签')
  })
})
