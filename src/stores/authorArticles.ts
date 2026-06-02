import { defineStore } from 'pinia'
import { reactive, ref } from 'vue'

import {
  createMyArticle,
  deleteMyArticle,
  getMyArticleDetail,
  getMyArticles,
  updateMyArticle,
} from '@/api/author-articles'
import { useUserAuthStore } from '@/stores/userAuth'
import type { PaginationMeta } from '@/types/api'
import type {
  ArticleDetail,
  ArticleFormPayload,
  ArticleStatus,
  ArticleSummary,
  MyArticleListQuery,
} from '@/types/article'
import { getUserToken } from '@/utils/auth-storage'
import { normalizeErrorMessage } from '@/utils/error-message'

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

export const useAuthorArticlesStore = defineStore('authorArticles', () => {
  const userAuthStore = useUserAuthStore()
  const items = ref<ArticleSummary[]>([])
  const currentArticle = ref<ArticleDetail | null>(null)
  const pagination = reactive<PaginationMeta>({ ...DEFAULT_PAGINATION })
  const filters = reactive<{
    keyword: string
    status?: ArticleStatus
  }>({
    keyword: '',
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

  function isCurrentUserRequest(requestToken: string | null) {
    return userAuthStore.token === requestToken && getUserToken() === requestToken
  }

  function isCurrentActionRequest(requestId: number, requestToken: string | null) {
    return requestId === latestActionRequestId && isCurrentUserRequest(requestToken)
  }

  function buildParams(): MyArticleListQuery {
    const params: MyArticleListQuery = {
      page: pagination.page,
      pageSize: pagination.pageSize,
    }

    const keyword = filters.keyword.trim()

    if (keyword) {
      params.keyword = keyword
    }

    if (filters.status) {
      params.status = filters.status
    }

    return params
  }

  async function fetchList() {
    const requestId = ++latestListRequestId
    const requestToken = getUserToken()
    loading.value = true
    error.value = null

    try {
      const response = await getMyArticles(buildParams())
      if (isLatestListRequest(requestId) && isCurrentUserRequest(requestToken)) {
        items.value = response.items
        Object.assign(pagination, response.meta)
      }
      return response.items
    } catch (caughtError) {
      if (!isCurrentUserRequest(requestToken)) {
        throw caughtError
      }

      userAuthStore.clearSessionIfConfirmedFailure(caughtError)
      if (isLatestListRequest(requestId)) {
        error.value = normalizeErrorMessage(caughtError, '获取文章列表失败')
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
    const requestToken = getUserToken()
    loading.value = true
    error.value = null

    try {
      const article = await getMyArticleDetail(id)
      if (requestId === latestDetailRequestId && isCurrentUserRequest(requestToken)) {
        currentArticle.value = article
      }
      return article
    } catch (caughtError) {
      if (!isCurrentUserRequest(requestToken)) {
        throw caughtError
      }

      userAuthStore.clearSessionIfConfirmedFailure(caughtError)
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

  async function createArticle(payload: ArticleFormPayload) {
    const requestId = ++latestActionRequestId
    const requestToken = getUserToken()
    loading.value = true
    error.value = null

    try {
      const article = await createMyArticle(payload)
      if (isCurrentActionRequest(requestId, requestToken) && !currentArticle.value) {
        currentArticle.value = article
      }
      return article
    } catch (caughtError) {
      if (!isCurrentUserRequest(requestToken)) {
        throw caughtError
      }

      userAuthStore.clearSessionIfConfirmedFailure(caughtError)
      if (requestId === latestActionRequestId) {
        error.value = normalizeErrorMessage(caughtError, '创建文章失败')
      }
      throw caughtError
    } finally {
      if (requestId === latestActionRequestId) {
        loading.value = false
      }
    }
  }

  async function updateArticle(id: number, payload: ArticleFormPayload) {
    const requestId = ++latestActionRequestId
    const requestToken = getUserToken()
    loading.value = true
    error.value = null

    try {
      const article = await updateMyArticle(id, payload)
      if (
        isCurrentActionRequest(requestId, requestToken) &&
        (!currentArticle.value || currentArticle.value.id === id)
      ) {
        currentArticle.value = article
      }
      return article
    } catch (caughtError) {
      if (!isCurrentUserRequest(requestToken)) {
        throw caughtError
      }

      userAuthStore.clearSessionIfConfirmedFailure(caughtError)
      if (requestId === latestActionRequestId) {
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
    const requestToken = getUserToken()
    loading.value = true
    error.value = null

    try {
      const shouldMoveBackPage = pagination.page > 1 && items.value.length === 1 && items.value[0]?.id === id
      const previousPage = pagination.page

      await deleteMyArticle(id)
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

        error.value = `文章已删除，但列表刷新失败：${normalizeErrorMessage(reloadError, '获取文章列表失败')}`
        throw reloadError
      }
    } catch (caughtError) {
      if (!isCurrentUserRequest(requestToken)) {
        throw caughtError
      }

      userAuthStore.clearSessionIfConfirmedFailure(caughtError)
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
    createArticle,
    updateArticle,
    deleteArticle,
  }
})
