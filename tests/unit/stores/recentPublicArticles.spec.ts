import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
  RECENT_PUBLIC_ARTICLES_MAX_ITEMS,
  RECENT_PUBLIC_ARTICLES_STORAGE_KEY,
} from '@/constants/public'
import { useRecentPublicArticlesStore } from '@/stores/recentPublicArticles'
import type { ArticleDetail } from '@/types/article'

const baseArticle: ArticleDetail = {
  id: 1,
  authorId: 7,
  author: {
    id: 7,
    username: 'author-1',
    nickname: '作者一',
    avatarUrl: '/avatar-1.png',
  },
  title: '文章一',
  summary: '摘要一',
  coverUrl: '/cover-1.png',
  contentMarkdown: '# 文章一',
  status: 'published',
  publishTime: '2026-05-15T08:00:00.000Z',
  updatedAt: '2026-05-15T08:00:00.000Z',
  categories: [],
  tags: [],
}

function createArticle(id: number, overrides: Partial<ArticleDetail> = {}): ArticleDetail {
  return {
    ...baseArticle,
    id,
    title: `文章${id}`,
    coverUrl: `/cover-${id}.png`,
    authorId: id,
    author: {
      ...baseArticle.author,
      id,
      username: `author-${id}`,
      nickname: `作者${id}`,
      ...overrides.author,
    },
    ...overrides,
  }
}

describe('recent public articles store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-15T10:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('restores persisted items during initialization', () => {
    localStorage.setItem(
      RECENT_PUBLIC_ARTICLES_STORAGE_KEY,
      JSON.stringify([
        {
          id: 3,
          title: '已浏览文章',
          authorId: 9,
          authorName: '作者九',
          coverUrl: '/cover-3.png',
          viewedAt: '2026-05-14T10:00:00.000Z',
        },
      ]),
    )

    const store = useRecentPublicArticlesStore()
    store.initRecentPublicArticles()

    expect(store.items).toEqual([
      {
        id: 3,
        title: '已浏览文章',
        authorId: 9,
        authorName: '作者九',
        coverUrl: '/cover-3.png',
        viewedAt: '2026-05-14T10:00:00.000Z',
      },
    ])
  })

  it('tracks article visits, deduplicates them, and keeps the latest visit first', () => {
    const store = useRecentPublicArticlesStore()
    store.initRecentPublicArticles()

    store.trackArticle(createArticle(1))
    vi.setSystemTime(new Date('2026-05-15T11:00:00.000Z'))
    store.trackArticle(createArticle(2))
    vi.setSystemTime(new Date('2026-05-15T12:00:00.000Z'))
    store.trackArticle(createArticle(1, { title: '文章一（新）' }))

    expect(store.items).toHaveLength(2)
    expect(store.items[0]).toMatchObject({
      id: 1,
      title: '文章一（新）',
      authorName: '作者1',
      viewedAt: '2026-05-15T12:00:00.000Z',
    })
    expect(store.items[1]).toMatchObject({
      id: 2,
      title: '文章2',
      authorName: '作者2',
    })
  })

  it('caps the list to the configured maximum', () => {
    const store = useRecentPublicArticlesStore()
    store.initRecentPublicArticles()

    for (let index = 1; index <= RECENT_PUBLIC_ARTICLES_MAX_ITEMS + 2; index += 1) {
      store.trackArticle(createArticle(index))
    }

    expect(store.items).toHaveLength(RECENT_PUBLIC_ARTICLES_MAX_ITEMS)
    expect(store.items[0]?.id).toBe(RECENT_PUBLIC_ARTICLES_MAX_ITEMS + 2)
    expect(store.items.at(-1)?.id).toBe(3)
  })

  it('deduplicates and caps restored persisted items during initialization', () => {
    localStorage.setItem(
      RECENT_PUBLIC_ARTICLES_STORAGE_KEY,
      JSON.stringify([
        {
          id: 1,
          title: '较新的文章一',
          authorId: 1,
          authorName: '作者一',
          coverUrl: '/cover-new-1.png',
          viewedAt: '2026-05-15T10:00:00.000Z',
        },
        {
          id: 2,
          title: '文章二',
          authorId: 2,
          authorName: '作者二',
          coverUrl: '/cover-2.png',
          viewedAt: '2026-05-15T09:00:00.000Z',
        },
        {
          id: 1,
          title: '旧的文章一',
          authorId: 1,
          authorName: '作者一',
          coverUrl: '/cover-old-1.png',
          viewedAt: '2026-05-14T10:00:00.000Z',
        },
        ...Array.from({ length: RECENT_PUBLIC_ARTICLES_MAX_ITEMS + 2 }, (_, index) => ({
          id: index + 3,
          title: `文章${index + 3}`,
          authorId: index + 3,
          authorName: `作者${index + 3}`,
          coverUrl: `/cover-${index + 3}.png`,
          viewedAt: `2026-05-13T0${index}:00:00.000Z`,
        })),
      ]),
    )

    const store = useRecentPublicArticlesStore()
    store.initRecentPublicArticles()

    expect(store.items).toHaveLength(RECENT_PUBLIC_ARTICLES_MAX_ITEMS)
    expect(store.items.map((item) => item.id)).toEqual([1, 2, 3, 4, 5, 6])
    expect(store.items[0]).toMatchObject({
      id: 1,
      title: '较新的文章一',
      coverUrl: '/cover-new-1.png',
    })
  })

  it('removes one item or clears all items', () => {
    const store = useRecentPublicArticlesStore()
    store.initRecentPublicArticles()

    store.trackArticle(createArticle(1))
    store.trackArticle(createArticle(2))
    store.removeArticle(1)

    expect(store.items.map((item) => item.id)).toEqual([2])

    store.clearAll()

    expect(store.items).toEqual([])
    expect(localStorage.getItem(RECENT_PUBLIC_ARTICLES_STORAGE_KEY)).toBe('[]')
  })

  it('does not throw when storage access is restricted', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage disabled')
    })

    const store = useRecentPublicArticlesStore()

    expect(() => store.initRecentPublicArticles()).not.toThrow()
    expect(() => store.trackArticle(createArticle(1))).not.toThrow()
    expect(store.items[0]).toMatchObject({
      id: 1,
      title: '文章1',
    })
  })
})
