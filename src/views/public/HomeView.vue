<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { useIntersectionObserver } from '@vueuse/core'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter, type LocationQuery } from 'vue-router'

import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ArticleCard from '@/components/public/ArticleCard.vue'
import PublicLeftRail from '@/components/public/PublicLeftRail.vue'
import PublicRightRail from '@/components/public/PublicRightRail.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { useCategoriesStore } from '@/stores/categories'
import { usePublicArticlesStore } from '@/stores/publicArticles'
import { useTagsStore } from '@/stores/tags'
import type { PublicArticleListFilterState } from '@/types/article'
import { getNextPublicFeedPage } from '@/utils/public-feed'
import { buildArticleListQuery, parseArticleListQuery } from '@/utils/query'

const DEFAULT_FILTERS: PublicArticleListFilterState = {
  page: 1,
  pageSize: 20,
  keyword: '',
  categoryIds: [],
  tagIds: [],
  sortField: undefined,
  sortOrder: undefined,
}

const router = useRouter()
const route = useRoute()
const appTitle = import.meta.env.VITE_APP_TITLE || '博客平台'
const publicArticlesStore = usePublicArticlesStore()
const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()

const { items, pagination, loading, error } = storeToRefs(publicArticlesStore)
const { items: categories, loading: categoriesLoading, error: categoriesError } =
  storeToRefs(categoriesStore)
const { items: tags, loading: tagsLoading, error: tagsError } = storeToRefs(tagsStore)

const draftFilters = ref<PublicArticleListFilterState>({ ...DEFAULT_FILTERS })
const feedSentinel = ref<HTMLElement | null>(null)
const loadingNextPage = ref(false)

function createStoreFilterState(): PublicArticleListFilterState {
  return {
    page: pagination.value.page,
    pageSize: pagination.value.pageSize,
    keyword: publicArticlesStore.keyword,
    categoryIds: [...publicArticlesStore.categoryIds],
    tagIds: [...publicArticlesStore.tagIds],
    sortField: publicArticlesStore.sortField,
    sortOrder: publicArticlesStore.sortOrder,
  }
}

function syncDraftFilters() {
  draftFilters.value = createStoreFilterState()
}

function isBaseQuery(filters: PublicArticleListFilterState) {
  return (
    filters.page === DEFAULT_FILTERS.page &&
    filters.pageSize === DEFAULT_FILTERS.pageSize &&
    filters.keyword.trim() === DEFAULT_FILTERS.keyword &&
    filters.categoryIds.length === 0 &&
    filters.tagIds.length === 0 &&
    filters.sortField === undefined &&
    filters.sortOrder === undefined
  )
}

function handleDraftFilterUpdate(filters: PublicArticleListFilterState) {
  draftFilters.value = filters
  void replaceRouteQuery({
    ...filters,
    pageSize: pagination.value.pageSize || filters.pageSize,
  })
}

function replaceRouteQuery(nextFilters: PublicArticleListFilterState) {
  const previousFilters = parseArticleListQuery(route.query)
  const nextQuery = buildArticleListQuery(nextFilters, previousFilters)
  const normalizedNextFilters = parseArticleListQuery(nextQuery as LocationQuery)

  if (isBaseQuery(normalizedNextFilters)) {
    return router.replace({
      name: ROUTE_NAMES.home,
    })
  }

  return router.replace({
    name: ROUTE_NAMES.home,
    query: nextQuery,
  })
}

async function syncRouteAndFetch() {
  loadingNextPage.value = false
  publicArticlesStore.syncFromRoute(route.query)
  syncDraftFilters()

  try {
    await publicArticlesStore.fetchList()
  } catch {
    // The store captures the user-facing error state.
  }
}

async function applyFilters() {
  await syncRouteAndFetch()
}

async function clearFilters() {
  draftFilters.value = { ...DEFAULT_FILTERS }
  await replaceRouteQuery({ ...DEFAULT_FILTERS })
}

async function retryFetch() {
  await syncRouteAndFetch()
}

async function searchFromRail(keyword: string) {
  await replaceRouteQuery({
    ...createStoreFilterState(),
    page: 1,
    keyword,
  })
}

async function loadNextPage() {
  const nextPage = getNextPublicFeedPage({
    page: pagination.value.page,
    totalPages: pagination.value.totalPages,
    loading: loading.value || loadingNextPage.value,
  })

  if (nextPage === null) {
    return
  }

  const previousPage = pagination.value.page
  loadingNextPage.value = true
  pagination.value.page = nextPage

  try {
    await publicArticlesStore.fetchList({ append: true })
  } catch {
    if (pagination.value.page === nextPage) {
      pagination.value.page = previousPage
    }
  } finally {
    loadingNextPage.value = false
  }
}

watch(
  () => route.fullPath,
  () => {
    void syncRouteAndFetch()
  },
  {
    immediate: true,
  },
)

onMounted(() => {
  void Promise.allSettled([categoriesStore.fetchAll(), tagsStore.fetchAll()])
})

useIntersectionObserver(
  feedSentinel,
  ([entry]) => {
    if (entry?.isIntersecting) {
      void loadNextPage()
    }
  },
  {
    rootMargin: '240px 0px',
  },
)

const taxonomyLoading = computed(() => categoriesLoading.value || tagsLoading.value)

const taxonomyError = computed(() => {
  const messages = [categoriesError.value, tagsError.value].filter(
    (message): message is string => Boolean(message),
  )

  return messages.length > 0 ? messages.join(' ') : null
})

const hasActiveFilters = computed(() => {
  const filters = parseArticleListQuery(route.query)

  return Boolean(
    filters.keyword ||
      filters.categoryIds.length > 0 ||
      filters.tagIds.length > 0 ||
      filters.sortField ||
      filters.sortOrder,
  )
})

const isInitialLoading = computed(() => loading.value && items.value.length === 0)

const hasNextPage = computed(
  () => pagination.value.totalPages > 0 && pagination.value.page < pagination.value.totalPages,
)

const resultSummary = computed(() => {
  if (pagination.value.total === 0) {
    return '0 篇'
  }

  return `${pagination.value.total} 篇 · ${pagination.value.page}/${Math.max(
    pagination.value.totalPages,
    1,
  )}`
})

</script>

<template>
  <div class="home-view">
    <section class="home-view__layout public-page-grid">
      <div class="home-view__left">
        <PublicLeftRail />
      </div>

      <div class="home-view__content">
        <section class="home-view__summary">
          <div>
            <h1 class="home-view__heading">文章</h1>
          </div>
          <p class="home-view__copy">{{ resultSummary }}</p>
        </section>

        <LoadingState v-if="isInitialLoading" />

        <ErrorState
          v-else-if="error && items.length === 0"
          :message="error"
          @retry="retryFetch"
        />

        <template v-else>
          <p v-if="error" class="home-view__global-error" role="alert" aria-live="assertive">
            {{ error }}
          </p>

          <EmptyState
            v-if="items.length === 0"
            :action-label="hasActiveFilters ? '清空筛选' : undefined"
            @action="clearFilters"
          />

          <template v-else>
            <section class="home-view__list" aria-label="文章列表">
              <ArticleCard
                v-for="article in items"
                :key="article.id"
                :article="article"
              />
            </section>

            <nav
              v-if="hasNextPage || loadingNextPage"
              class="home-view__pagination"
              aria-label="文章加载"
            >
              <button
                data-test="load-next-page"
                class="home-view__page-button"
                type="button"
                :disabled="loadingNextPage"
                @click="loadNextPage"
              >
                {{ loadingNextPage ? '加载中' : '更多' }}
              </button>
              <span class="home-view__page-status">{{ pagination.page }}/{{ pagination.totalPages }}</span>
            </nav>

            <div ref="feedSentinel" class="home-view__sentinel" aria-hidden="true" />
          </template>
        </template>
      </div>

      <PublicRightRail
        :categories="categories"
        :tags="tags"
        :filters="draftFilters"
        :taxonomy-loading="taxonomyLoading"
        :taxonomy-error="taxonomyError"
        :site-name="appTitle"
        @search="searchFromRail"
        @update:filters="handleDraftFilterUpdate"
        @apply="applyFilters"
        @clear="clearFilters"
      />
    </section>
  </div>
</template>

<style scoped>
.home-view {
  min-width: 0;
}

.home-view__layout {
  max-width: 1280px;
  margin: 0 auto;
}

.home-view__left {
  position: sticky;
  top: 74px;
  display: grid;
  align-content: start;
  height: fit-content;
}

.home-view__content {
  min-width: 0;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-module);
  background: var(--public-module-background);
  overflow: hidden;
}

.home-view__list {
  display: grid;
}

.home-view__summary,
.home-view__pagination {
  padding: 0.85rem 1rem;
}

.home-view__summary {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
  border-bottom: 1px solid var(--public-feed-divider);
}

.home-view__heading,
.home-view__copy,
.home-view__global-error {
  margin: 0;
}

.home-view__heading {
  font-size: 1.15rem;
}

.home-view__copy {
  color: var(--color-muted);
  font-size: 0.92rem;
}

.home-view__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-top: 1px solid var(--public-feed-divider);
}

.home-view__global-error {
  padding: 0.85rem 1rem;
  border-bottom: 1px solid var(--public-feed-divider);
  color: var(--color-danger);
  font-size: 0.92rem;
}

.home-view__page-button {
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

.home-view__page-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.home-view__page-status {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.home-view__sentinel {
  width: 100%;
  height: 1px;
}

@media (max-width: 1080px) {
  .home-view__left {
    position: static;
    max-height: none;
    overflow: visible;
    order: 2;
  }

  .home-view__content {
    order: 1;
  }

  .home-view :deep(.public-right-rail) {
    order: 3;
  }
}

@media (max-width: 640px) {
  .home-view__summary,
  .home-view__pagination {
    padding-inline: 0.75rem;
  }
}
</style>
