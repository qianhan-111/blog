import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

import {
  deleteAdminArticle,
  getAdminArticleDetail,
  getAdminArticles,
  updateAdminArticle,
} from '@/api/author-articles'
import { useAdminAuthStore } from '@/stores/adminAuth'
import type { PaginationMeta } from '@/types/api'
import type {
  AdminArticleListQuery,
  ArticleDetail,
  ArticleFormPayload,
  ArticleStatus,
  ArticleSummary,
} from '@/types/article'
import { getAdminToken } from '@/utils/auth-storage'
import { normalizeErrorMessage } from '@/utils/error-message'

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

export const useAdminArticlesStore = defineStore('adminArticles', () => {
  const adminAuthStore = useAdminAuthStore()
  const items = ref<ArticleSummary[]>([])
  const currentArticle = ref<ArticleDetail | null>(null)
  const pagination = reactive<PaginationMeta>({ ...DEFAULT_PAGINATION })
  const filters = reactive<{
    keyword: string
    authorId?: number
    status?: ArticleStatus
  }>({
    keyword: '',
    authorId: undefined,
    status: undefined,
  })
  const loading = ref(false)
  const error = ref<string | null>(null)
  let latestListRequestId = 0
  let latestDetailRequestId = 0
  let latestActionRequestId = 0

  function isLatestListRequest(requestId: number) {
    return requestId === latestListRequestId
  }

  function isCurrentAdminRequest(requestToken: string | null) {
    return adminAuthStore.token === requestToken && getAdminToken() === requestToken
  }

  function isCurrentActionRequest(requestId: number, requestToken: string | null) {
    return requestId === latestActionRequestId && isCurrentAdminRequest(requestToken)
  }

  function buildParams(): AdminArticleListQuery {
    const params: AdminArticleListQuery = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }

    const keyword = filters.keyword.trim()

    if (keyword) {
      params.keyword = keyword
    }

    if (typeof filters.authorId === 'number' && filters.authorId > 0) {
      params.authorId = filters.authorId
    }

    if (filters.status) {
      params.status = filters.status
    }

    return params
  }

  function matchesActiveFilters(article: ArticleSummary) {
    const keyword = filters.keyword.trim().toLowerCase()

    if (typeof filters.authorId === 'number' && filters.authorId > 0 && article.authorId !== filters.authorId) {
      return false
    }

    if (filters.status && article.status !== filters.status) {
      return false
    }

    if (keyword) {
      return `${article.title} ${article.summary}`.toLowerCase().includes(keyword)
    }

    return true
  }

  async function fetchList() {
    const requestId = ++latestListRequestId
    const requestToken = getAdminToken()
    loading.value = true
    error.value = null

    try {
      const response = await getAdminArticles(buildParams())
      if (isLatestListRequest(requestId) && isCurrentAdminRequest(requestToken)) {
        items.value = response.items
        Object.assign(pagination, response.meta)
      }
      return response.items
    } catch (caughtError) {
      if (!isCurrentAdminRequest(requestToken)) {
        throw caughtError
      }

      adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
      if (isLatestListRequest(requestId)) {
        error.value = normalizeErrorMessage(caughtError, '获取全站文章失败')
      }
      throw caughtError
    } finally {
      if (isLatestListRequest(requestId)) {
        loading.value = false
      }
    }
  }

  async function fetchDetail(id: number) {
    const requestId = ++latestDetailRequestId
    const requestToken = getAdminToken()
    loading.value = true
    error.value = null

    try {
      const article = await getAdminArticleDetail(id)
      if (requestId === latestDetailRequestId && isCurrentAdminRequest(requestToken)) {
        currentArticle.value = article
      }
      return article
    } catch (caughtError) {
      if (!isCurrentAdminRequest(requestToken)) {
        throw caughtError
      }

      adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
      if (requestId === latestDetailRequestId) {
        error.value = normalizeErrorMessage(caughtError, '获取文章详情失败')
      }
      throw caughtError
    } finally {
      if (requestId === latestDetailRequestId) {
        loading.value = false
      }
    }
  }

  async function updateArticle(id: number, payload: ArticleFormPayload) {
    const requestId = ++latestActionRequestId
    const requestToken = getAdminToken()
    loading.value = true
    error.value = null

    try {
      const article = await updateAdminArticle(id, payload)
      if (!isCurrentActionRequest(requestId, requestToken)) {
        return article
      }

      if (!currentArticle.value || currentArticle.value.id === id) {
        currentArticle.value = article
      }
      const matchesAfterUpdate = matchesActiveFilters(article)
      const shouldMoveBackPage =
        !matchesAfterUpdate &&
        pagination.page > 1 &&
        items.value.length === 1 &&
        items.value[0]?.id === article.id
      const previousPage = pagination.page

      if (shouldMoveBackPage) {
        pagination.page -= 1
      }

      const reloadRequestId = latestListRequestId + 1
      try {
        await fetchList()
      } catch (reloadError) {
        if (!isCurrentActionRequest(requestId, requestToken)) {
          return article
        }

        if (!isLatestListRequest(reloadRequestId)) {
          return article
        }

        if (shouldMoveBackPage) {
          pagination.page = previousPage
        }

        error.value = `文章已保存，但列表刷新失败：${normalizeErrorMessage(reloadError, '获取全站文章失败')}`
        throw reloadError
      }

      return article
    } catch (caughtError) {
      if (!isCurrentAdminRequest(requestToken)) {
        throw caughtError
      }

      adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
      if (requestId === latestActionRequestId && !error.value) {
        error.value = normalizeErrorMessage(caughtError, '更新文章失败')
      }
      throw caughtError
    } finally {
      if (requestId === latestActionRequestId) {
        loading.value = false
      }
    }
  }

  async function deleteArticle(id: number) {
    const requestId = ++latestActionRequestId
    const requestToken = getAdminToken()
    loading.value = true
    error.value = null

    try {
      const shouldMoveBackPage = pagination.page > 1 && items.value.length === 1 && items.value[0]?.id === id
      const previousPage = pagination.page

      await deleteAdminArticle(id)
      if (!isCurrentActionRequest(requestId, requestToken)) {
        return
      }

      if (currentArticle.value?.id === id) {
        currentArticle.value = null
      }
      if (shouldMoveBackPage) {
        pagination.page -= 1
      }

      const reloadRequestId = latestListRequestId + 1
      try {
        await fetchList()
      } catch (reloadError) {
        if (!isCurrentActionRequest(requestId, requestToken)) {
          return
        }

        if (!isLatestListRequest(reloadRequestId)) {
          return
        }

        if (shouldMoveBackPage) {
          pagination.page = previousPage
        }

        error.value = `文章已删除，但列表刷新失败：${normalizeErrorMessage(reloadError, '获取全站文章失败')}`
        throw reloadError
      }
    } catch (caughtError) {
      if (!isCurrentAdminRequest(requestToken)) {
        throw caughtError
      }

      adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
      if (requestId === latestActionRequestId && !error.value) {
        error.value = normalizeErrorMessage(caughtError, '删除文章失败')
      }

      throw caughtError
    } finally {
      if (requestId === latestActionRequestId) {
        loading.value = false
      }
    }
  }

  return {
    items,
    currentArticle,
    pagination,
    filters,
    loading,
    error,
    fetchList,
    fetchDetail,
    updateArticle,
    deleteArticle,
  }
})
