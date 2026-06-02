import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { LocationQuery } from 'vue-router'

import { getPublicArticles } from '@/api/public-articles'
import type { PaginationMeta } from '@/types/api'
import type {
  ArticleSortField,
  ArticleSummary,
  PublicArticleFetchOptions,
  PublicArticleListQuery,
  SortOrder,
} from '@/types/article'
import { normalizeErrorMessage } from '@/utils/error-message'
import { normalizePageSize, parseArticleListQuery } from '@/utils/query'

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 0,
}

function buildRequestParams(state: {
  page: number
  pageSize: number
  keyword: string
  categoryIds: number[]
  tagIds: number[]
  sortField?: ArticleSortField
  sortOrder?: SortOrder
}): PublicArticleListQuery {
  const params: PublicArticleListQuery = {
    page: state.page,
    pageSize: normalizePageSize(state.pageSize),
  }

  const keyword = state.keyword.trim()

  if (keyword) {
    params.keyword = keyword
  }

  if (state.categoryIds.length > 0) {
    params.categoryIds = [...state.categoryIds]
  }

  if (state.tagIds.length > 0) {
    params.tagIds = [...state.tagIds]
  }

  if (state.sortField) {
    params.sortField = state.sortField
  }

  if (state.sortOrder) {
    params.sortOrder = state.sortOrder
  }

  return params
}

function appendUniqueArticles(currentItems: ArticleSummary[], nextItems: ArticleSummary[]) {
  const seenIds = new Set(currentItems.map((item) => item.id))
  const uniqueNextItems = nextItems.filter((item) => {
    if (seenIds.has(item.id)) {
      return false
    }

    seenIds.add(item.id)
    return true
  })

  return [...currentItems, ...uniqueNextItems]
}

export const usePublicArticlesStore = defineStore('publicArticles', () => {
  const items = ref<ArticleSummary[]>([])
  const pagination = ref<PaginationMeta>({ ...DEFAULT_PAGINATION })
  const keyword = ref('')
  const categoryIds = ref<number[]>([])
  const tagIds = ref<number[]>([])
  const sortField = ref<ArticleSortField | undefined>(undefined)
  const sortOrder = ref<SortOrder | undefined>(undefined)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let latestRequestId = 0

  async function fetchList(options: PublicArticleFetchOptions = {}) {
    const requestId = ++latestRequestId
    loading.value = true
    error.value = null

    try {
      const response = await getPublicArticles(
        buildRequestParams({
          page: pagination.value.page,
          pageSize: pagination.value.pageSize,
          keyword: keyword.value,
          categoryIds: categoryIds.value,
          tagIds: tagIds.value,
          sortField: sortField.value,
          sortOrder: sortOrder.value,
        }),
      )

      if (requestId === latestRequestId) {
        const shouldAppend = options.append === true && response.meta.page > 1
        items.value = shouldAppend ? appendUniqueArticles(items.value, response.items) : response.items
        pagination.value = { ...response.meta }
      }
    } catch (caughtError) {
      if (requestId === latestRequestId) {
        error.value = normalizeErrorMessage(caughtError, '文章加载失败')
      }

      throw caughtError
    } finally {
      if (requestId === latestRequestId) {
        loading.value = false
      }
    }
  }

  function clearFilters() {
    keyword.value = ''
    categoryIds.value = []
    tagIds.value = []
    sortField.value = undefined
    sortOrder.value = undefined
    pagination.value.page = 1
  }

  function syncFromRoute(query: LocationQuery) {
    const filters = parseArticleListQuery(query)

    pagination.value.page = filters.page
    pagination.value.pageSize = filters.pageSize
    keyword.value = filters.keyword
    categoryIds.value = filters.categoryIds
    tagIds.value = filters.tagIds
    sortField.value = filters.sortField
    sortOrder.value = filters.sortOrder
  }

  return {
    items,
    pagination,
    keyword,
    categoryIds,
    tagIds,
    sortField,
    sortOrder,
    loading,
    error,
    clearFilters,
    fetchList,
    syncFromRoute,
  }
})
