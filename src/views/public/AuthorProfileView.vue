<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ArticleCard from '@/components/public/ArticleCard.vue'
import PublicRailFooter from '@/components/public/PublicRailFooter.vue'
import { getAuthorArticles, getAuthorProfile } from '@/api/public-articles'
import { useRecentPublicArticlesStore } from '@/stores/recentPublicArticles'
import type { PaginationMeta } from '@/types/api'
import type { ArticleSummary } from '@/types/article'
import type { PublicAuthorProfile } from '@/types/user'
import { getRecoveryMessage, normalizeErrorMessage } from '@/utils/error-message'
import { parsePositiveRouteInteger } from '@/utils/route-params'

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
}

const route = useRoute()
const appTitle = import.meta.env.VITE_APP_TITLE || '博客平台'
const recentPublicArticlesStore = useRecentPublicArticlesStore()

const profile = ref<PublicAuthorProfile | null>(null)
const articles = ref<ArticleSummary[]>([])
const pagination = ref<PaginationMeta>({ ...DEFAULT_PAGINATION })
const loading = ref(false)
const error = ref<string | null>(null)
const loadRecovery = ref('')
const isRetryingLoad = ref(false)
let latestAuthorRequestId = 0

const authorId = computed(() => parsePositiveRouteInteger(route.params.id))
const recentArticles = computed(() => recentPublicArticlesStore.items.slice(0, 5))
const isInitialLoading = computed(() => loading.value && !profile.value)
const isArticleListLoading = computed(() => loading.value && Boolean(profile.value) && articles.value.length === 0 && !error.value)
const visiblePages = computed(() => {
  const totalPages = pagination.value.totalPages
  const currentPage = pagination.value.page

  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, start + 4)
  const adjustedStart = Math.max(1, end - 4)

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index)
})

async function fetchAuthorData(page = pagination.value.page) {
  const requestId = ++latestAuthorRequestId
  const requestedAuthorId = authorId.value

  if (requestedAuthorId === null) {
    profile.value = null
    articles.value = []
    error.value = '无效的作者编号'
    loadRecovery.value = ''
    isRetryingLoad.value = false
    loading.value = false
    return
  }

  const canRetainCurrentAuthor = profile.value?.id === authorId.value
  const shouldKeepErrorVisible = !profile.value && Boolean(error.value)
  isRetryingLoad.value = shouldKeepErrorVisible
  loading.value = true

  if (!shouldKeepErrorVisible) {
    error.value = null
    loadRecovery.value = ''
  }

  try {
    const nextProfile = await getAuthorProfile(requestedAuthorId)

    if (requestId !== latestAuthorRequestId || authorId.value !== requestedAuthorId) {
      return
    }

    profile.value = nextProfile

    try {
      const nextArticles = await getAuthorArticles(requestedAuthorId, {
        page,
        pageSize: pagination.value.pageSize,
        sortField: 'publishTime',
        sortOrder: 'desc',
      })

      if (requestId !== latestAuthorRequestId || authorId.value !== requestedAuthorId) {
        return
      }

      articles.value = nextArticles.items
      pagination.value = { ...nextArticles.meta }
      error.value = null
      loadRecovery.value = ''
    } catch (caughtError) {
      if (requestId !== latestAuthorRequestId || authorId.value !== requestedAuthorId) {
        return
      }

      if (!canRetainCurrentAuthor) {
        articles.value = []
        pagination.value = { ...DEFAULT_PAGINATION }
      }

      error.value = normalizeErrorMessage(caughtError, '文章加载失败')
      loadRecovery.value = getRecoveryMessage(caughtError)
    }
  } catch (caughtError) {
    if (requestId !== latestAuthorRequestId || authorId.value !== requestedAuthorId) {
      return
    }

    if (!canRetainCurrentAuthor) {
      profile.value = null
      articles.value = []
      pagination.value = { ...DEFAULT_PAGINATION }
    }

    error.value = normalizeErrorMessage(caughtError, '作者加载失败')
    loadRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    if (requestId === latestAuthorRequestId && authorId.value === requestedAuthorId) {
      isRetryingLoad.value = false
      loading.value = false
    }
  }
}

async function goToPage(page: number) {
  if (page < 1 || page > pagination.value.totalPages || page === pagination.value.page) {
    return
  }

  await fetchAuthorData(page)
}

watch(
  () => route.params.id,
  () => {
    const nextAuthorId = authorId.value
    pagination.value = { ...DEFAULT_PAGINATION }

    if (profile.value?.id !== nextAuthorId) {
      profile.value = null
      articles.value = []
      error.value = null
    }

    void fetchAuthorData(1)
  },
  {
    immediate: true,
  },
)

onMounted(() => {
  recentPublicArticlesStore.initRecentPublicArticles()
})
</script>

<template>
  <section class="author-profile-view">
    <LoadingState v-if="isInitialLoading && !error" title="加载作者" message="获取资料" />

    <ErrorState
      v-else-if="error && !profile"
      title="作者不可用"
      :message="error"
      :recovery-message="loadRecovery"
      :retrying="isRetryingLoad"
      @retry="fetchAuthorData(1)"
    />

    <template v-else-if="profile">
      <div class="author-profile-view__layout">
        <main class="author-profile-view__feed">
          <section class="author-profile-view__summary">
            <h1 class="author-profile-view__list-title">{{ profile.nickname || profile.username }}</h1>
            <p class="author-profile-view__copy">{{ pagination.total }} 篇</p>
          </section>

          <p v-if="error" class="author-profile-view__global-error" role="alert" aria-live="assertive">
            {{ error }}
          </p>

          <LoadingState
            v-if="isArticleListLoading"
            title="加载文章"
            message="获取公开作品"
          />

          <EmptyState
            v-else-if="articles.length === 0"
            title="暂无文章"
            message="稍后再试"
          />

          <template v-else>
            <section class="author-profile-view__list" aria-label="作者文章">
              <ArticleCard
                v-for="article in articles"
                :key="article.id"
                :article="article"
              />
            </section>

            <nav
              v-if="pagination.totalPages > 1"
              class="author-profile-view__pagination"
              aria-label="作者文章分页"
            >
              <button
                class="author-profile-view__page-button"
                type="button"
                :disabled="pagination.page <= 1"
                @click="goToPage(pagination.page - 1)"
              >
                上一页
              </button>

              <div class="author-profile-view__page-list">
                <button
                  v-for="page in visiblePages"
                  :key="page"
                  class="author-profile-view__page-button"
                  :class="{ 'is-active': page === pagination.page }"
                  type="button"
                  @click="goToPage(page)"
                >
                  {{ page }}
                </button>
              </div>

              <button
                class="author-profile-view__page-button"
                type="button"
                :disabled="pagination.page >= pagination.totalPages"
                @click="goToPage(pagination.page + 1)"
              >
                下一页
              </button>
            </nav>
          </template>
        </main>

        <aside class="author-profile-view__side public-rail" data-test="author-right-rail">
          <section class="public-side-module author-profile-view__identity">
            <img
              v-if="profile.avatarUrl"
              class="author-profile-view__avatar"
              :src="profile.avatarUrl"
              :alt="profile.nickname || profile.username"
            />
            <div v-else class="author-profile-view__avatar author-profile-view__avatar--fallback" aria-hidden="true">
              {{ (profile.nickname || profile.username).slice(0, 1).toUpperCase() }}
            </div>

            <div class="author-profile-view__copy">
              <h2 class="author-profile-view__title">{{ profile.nickname || profile.username }}</h2>
              <p class="author-profile-view__bio">
                {{ profile.bio || '暂无简介' }}
              </p>
            </div>
          </section>

          <section class="public-side-module author-profile-view__stats">
            <h2 class="author-profile-view__side-title">文章</h2>
            <p class="author-profile-view__copy">{{ pagination.total }} 篇公开</p>
          </section>

          <section class="public-side-module author-profile-view__recent">
            <h2 class="author-profile-view__side-title">最近浏览</h2>
            <div v-if="recentArticles.length > 0" class="public-side-list">
              <RouterLink
                v-for="recentArticle in recentArticles"
                :key="recentArticle.id"
                class="public-side-link"
                :to="`/articles/${recentArticle.id}`"
              >
                <strong>{{ recentArticle.title }}</strong>
                <span>{{ recentArticle.authorName }}</span>
              </RouterLink>
            </div>
            <p v-else class="author-profile-view__muted">还没有浏览记录</p>
          </section>

          <PublicRailFooter :site-name="appTitle" />
        </aside>
      </div>
    </template>
  </section>
</template>

<style scoped>
.author-profile-view {
  min-width: 0;
}

.author-profile-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 46rem) minmax(16rem, 20rem);
  gap: var(--public-space-module);
  align-items: start;
  max-width: 1080px;
  margin: 0 auto;
}

.author-profile-view__feed {
  min-width: 0;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-module);
  background: var(--public-module-background);
  overflow: hidden;
}

.author-profile-view__copy,
.author-profile-view__list {
  display: grid;
  gap: 0.45rem;
}

.author-profile-view__summary,
.author-profile-view__pagination {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: end;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--public-feed-divider);
}

.author-profile-view__title,
.author-profile-view__bio,
.author-profile-view__list-title,
.author-profile-view__side-title,
.author-profile-view__copy,
.author-profile-view__global-error {
  margin: 0;
}

.author-profile-view__title {
  font-size: 1rem;
}

.author-profile-view__bio,
.author-profile-view__copy {
  color: var(--color-muted);
  font-size: 0.92rem;
}

.author-profile-view__list-title {
  font-size: 1.15rem;
}

.author-profile-view__side {
  position: sticky;
  top: 74px;
}

.author-profile-view__identity {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.75rem;
  align-items: center;
}

.author-profile-view__avatar {
  width: 3rem;
  height: 3rem;
  border-radius: var(--public-radius-module);
  object-fit: cover;
}

.author-profile-view__avatar--fallback {
  display: grid;
  place-items: center;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-weight: 700;
}

.author-profile-view__stats {
  display: grid;
  gap: 0.45rem;
}

.author-profile-view__recent {
  display: grid;
  gap: 0.75rem;
}

.author-profile-view__side-title {
  font-size: 0.94rem;
}

.author-profile-view__muted {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.92rem;
}

.author-profile-view__pagination {
  align-items: center;
  border-top: 1px solid var(--public-feed-divider);
  border-bottom: 0;
}

.author-profile-view__global-error {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--public-feed-divider);
  color: var(--color-danger);
  font-size: 0.92rem;
}

.author-profile-view__page-list {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.author-profile-view__page-button {
  min-width: 2.25rem;
  min-height: 2.25rem;
  padding: 0.45rem 0.65rem;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-compact);
  background: transparent;
  color: var(--color-text);
  font-weight: 650;
  cursor: pointer;
}

.author-profile-view__page-button.is-active {
  background: var(--color-surface-strong);
  border-color: transparent;
  color: var(--color-on-surface-strong);
}

.author-profile-view__page-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 900px) {
  .author-profile-view__layout {
    grid-template-columns: 1fr;
  }

  .author-profile-view__side {
    position: static;
  }

  .author-profile-view__pagination {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
