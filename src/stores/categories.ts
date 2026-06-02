import { defineStore } from 'pinia'
import { ref } from 'vue'

import { getCategories } from '@/api/categories'
import type { Category } from '@/types/category'
import { normalizeErrorMessage } from '@/utils/error-message'

export const useCategoriesStore = defineStore('categories', () => {
  const items = ref<Category[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const hasLoaded = ref(false)
  let latestRequestId = 0

  async function fetchAll(force = false) {
    if (hasLoaded.value && !force) {
      error.value = null
      return items.value
    }

    const requestId = ++latestRequestId
    loading.value = true
    error.value = null

    try {
      const nextItems = await getCategories()

      if (requestId === latestRequestId) {
        items.value = nextItems
        hasLoaded.value = true
      }

      return items.value
    } catch (caughtError) {
      if (requestId === latestRequestId) {
        hasLoaded.value = false
        error.value = normalizeErrorMessage(caughtError, '分类加载失败')
      }

      throw caughtError
    } finally {
      if (requestId === latestRequestId) {
        loading.value = false
      }
    }
  }

  return {
    items,
    loading,
    error,
    fetchAll,
  }
})
