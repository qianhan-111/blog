import { defineStore } from 'pinia'
import { ref } from 'vue'

import {
  RECENT_PUBLIC_ARTICLES_MAX_ITEMS,
  RECENT_PUBLIC_ARTICLES_STORAGE_KEY,
} from '@/constants/public'
import type { ArticleDetail } from '@/types/article'

export interface RecentPublicArticleItem {
  id: number
  title: string
  authorId: number
  authorName: string
  coverUrl: string
  viewedAt: string
}

function isRecentPublicArticleItem(value: unknown): value is RecentPublicArticleItem {
  if (!value || typeof value !== 'object') {
    return false
  }

  const item = value as Record<string, unknown>

  return (
    Number.isInteger(item.id) &&
    Number.isInteger(item.authorId) &&
    typeof item.title === 'string' &&
    typeof item.authorName === 'string' &&
    typeof item.coverUrl === 'string' &&
    typeof item.viewedAt === 'string'
  )
}

function readStoredItems(): RecentPublicArticleItem[] {
  try {
    const rawValue = localStorage.getItem(RECENT_PUBLIC_ARTICLES_STORAGE_KEY)

    if (!rawValue) {
      return []
    }

    const parsedValue = JSON.parse(rawValue) as unknown

    if (!Array.isArray(parsedValue)) {
      return []
    }

    const seenIds = new Set<number>()
    const items = parsedValue
      .filter(isRecentPublicArticleItem)
      .filter((item) => {
        if (seenIds.has(item.id)) {
          return false
        }

        seenIds.add(item.id)
        return true
      })
      .slice(0, RECENT_PUBLIC_ARTICLES_MAX_ITEMS)

    persistItems(items)
    return items
  } catch {
    return []
  }
}

function persistItems(items: RecentPublicArticleItem[]) {
  try {
    localStorage.setItem(RECENT_PUBLIC_ARTICLES_STORAGE_KEY, JSON.stringify(items))
  } catch {
    // Ignore storage failures so in-memory updates still work.
  }
}

function createRecentPublicArticleItem(article: ArticleDetail): RecentPublicArticleItem {
  return {
    id: article.id,
    title: article.title,
    authorId: article.authorId,
    authorName: article.author.nickname || article.author.username,
    coverUrl: article.coverUrl,
    viewedAt: new Date().toISOString(),
  }
}

export const useRecentPublicArticlesStore = defineStore('recentPublicArticles', () => {
  const items = ref<RecentPublicArticleItem[]>([])
  const isInitialized = ref(false)

  function initRecentPublicArticles() {
    items.value = readStoredItems()
    isInitialized.value = true
  }

  function ensureInitialized() {
    if (!isInitialized.value) {
      initRecentPublicArticles()
    }
  }

  function trackArticle(article: ArticleDetail) {
    ensureInitialized()

    const nextItem = createRecentPublicArticleItem(article)
    const nextItems = [
      nextItem,
      ...items.value.filter((item) => item.id !== nextItem.id),
    ].slice(0, RECENT_PUBLIC_ARTICLES_MAX_ITEMS)

    items.value = nextItems
    persistItems(nextItems)
  }

  function removeArticle(id: number) {
    ensureInitialized()
    items.value = items.value.filter((item) => item.id !== id)
    persistItems(items.value)
  }

  function clearAll() {
    ensureInitialized()
    items.value = []
    persistItems(items.value)
  }

  return {
    items,
    initRecentPublicArticles,
    trackArticle,
    removeArticle,
    clearAll,
  }
})
