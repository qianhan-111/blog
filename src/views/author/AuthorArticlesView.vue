<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import ConfirmAction from '@/components/common/ConfirmAction.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import { useAuthorArticlesStore } from '@/stores/authorArticles'
import { useUserAuthStore } from '@/stores/userAuth'
import { getUserToken } from '@/utils/auth-storage'
import { getRecoveryMessage, normalizeErrorMessage } from '@/utils/error-message'

const authorArticlesStore = useAuthorArticlesStore()
const userAuthStore = useUserAuthStore()
const pendingDeleteId = ref<number | null>(null)
const actionError = ref('')
const actionRecovery = ref('')
const loadRecovery = ref('')
const lastLoadError = ref('')
const isRetryingLoad = ref(false)
const isDeleting = ref(false)

const filteredStatusLabel = computed(() =>
  authorArticlesStore.filters.status === 'published' ? '已发布' : authorArticlesStore.filters.status === 'draft' ? '草稿' : '全部',
)

const visiblePages = computed(() => {
  const totalPages = Math.max(1, authorArticlesStore.pagination.totalPages)
  const currentPage = authorArticlesStore.pagination.page

  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, start + 4)
  const adjustedStart = Math.max(1, end - 4)

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index)
})

async function retryFetch() {
  actionError.value = ''
  actionRecovery.value = ''
  isRetryingLoad.value = true

  try {
    await authorArticlesStore.fetchList()
    lastLoadError.value = ''
    loadRecovery.value = ''
  } catch (caughtError) {
    if (!authorArticlesStore.error) {
      return
    }

    lastLoadError.value = authorArticlesStore.error ?? '获取文章列表失败'
    loadRecovery.value = getRecoveryMessage(caughtError)

    if (authorArticlesStore.items.length > 0) {
      actionError.value = authorArticlesStore.error ?? '获取文章列表失败'
      actionRecovery.value = loadRecovery.value
    }
  } finally {
    isRetryingLoad.value = false
  }
}

async function applyFilters() {
  const previousPage = authorArticlesStore.pagination.page
  authorArticlesStore.pagination.page = 1
  actionError.value = ''
  actionRecovery.value = ''

  try {
    await authorArticlesStore.fetchList()
    lastLoadError.value = ''
    loadRecovery.value = ''
  } catch (caughtError) {
    if (!authorArticlesStore.error) {
      return
    }

    lastLoadError.value = authorArticlesStore.error ?? '获取文章列表失败'
    loadRecovery.value = getRecoveryMessage(caughtError)

    if (authorArticlesStore.items.length > 0) {
      actionError.value = authorArticlesStore.error ?? '获取文章列表失败'
      actionRecovery.value = loadRecovery.value
    }

    authorArticlesStore.pagination.page = previousPage
  }
}

async function changePage(page: number) {
  const totalPages = Math.max(1, authorArticlesStore.pagination.totalPages)

  if (page < 1 || page > totalPages || page === authorArticlesStore.pagination.page) {
    return
  }

  const previousPage = authorArticlesStore.pagination.page
  authorArticlesStore.pagination.page = page
  actionError.value = ''
  actionRecovery.value = ''

  try {
    await authorArticlesStore.fetchList()
    lastLoadError.value = ''
    loadRecovery.value = ''
  } catch (caughtError) {
    if (!authorArticlesStore.error) {
      return
    }

    authorArticlesStore.pagination.page = previousPage
    lastLoadError.value = authorArticlesStore.error ?? '获取文章列表失败'
    loadRecovery.value = getRecoveryMessage(caughtError)

    if (authorArticlesStore.items.length > 0) {
      actionError.value = authorArticlesStore.error ?? '获取文章列表失败'
      actionRecovery.value = loadRecovery.value
    }
  }
}

function openDeleteConfirm(id: number) {
  pendingDeleteId.value = id
}

function closeDeleteConfirm() {
  if (isDeleting.value) {
    return
  }

  pendingDeleteId.value = null
}

function isCurrentUserAction(requestToken: string | null) {
  return userAuthStore.token === requestToken && getUserToken() === requestToken
}

async function confirmDelete() {
  if (pendingDeleteId.value === null || isDeleting.value) {
    return
  }

  const articleId = pendingDeleteId.value
  isDeleting.value = true
  actionError.value = ''
  actionRecovery.value = ''
  const requestToken = getUserToken()

  try {
    await authorArticlesStore.deleteArticle(articleId)
    if (!isCurrentUserAction(requestToken)) {
      return
    }

    lastLoadError.value = ''
    loadRecovery.value = ''
  } catch (caughtError) {
    if (!isCurrentUserAction(requestToken)) {
      return
    }

    actionError.value = authorArticlesStore.error ?? normalizeErrorMessage(caughtError, '删除文章失败')
    actionRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    isDeleting.value = false
    if (isCurrentUserAction(requestToken)) {
      closeDeleteConfirm()
    }
  }
}

onMounted(() => {
  void retryFetch()
})
</script>

<template>
  <section class="author-articles-view">
    <header class="surface-card author-articles-view__hero">
      <div>
        <p class="author-articles-view__eyebrow">我的文章</p>
        <h1 class="author-articles-view__title">作者文章列表</h1>
        <p class="author-articles-view__copy">筛选、编辑、删除你的文章</p>
      </div>
    </header>

    <section class="surface-card author-articles-view__filters">
      <label class="author-articles-view__field">
        <span>关键字</span>
        <input
          v-model="authorArticlesStore.filters.keyword"
          type="search"
          placeholder="搜索标题或摘要"
        />
      </label>

      <label class="author-articles-view__field">
        <span>状态</span>
        <select v-model="authorArticlesStore.filters.status">
          <option :value="undefined">全部</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
        </select>
      </label>

      <button class="author-articles-view__action" type="button" @click="applyFilters">应用筛选</button>
    </section>

    <p v-if="actionError" class="author-articles-view__global-error" role="alert" aria-live="assertive">{{ actionError }}</p>
    <p v-if="actionRecovery" class="author-articles-view__global-recovery" role="status" aria-live="polite">{{ actionRecovery }}</p>

    <LoadingState v-if="authorArticlesStore.loading && authorArticlesStore.items.length === 0 && !lastLoadError" />

    <ErrorState
      v-else-if="(authorArticlesStore.error || lastLoadError) && authorArticlesStore.items.length === 0"
      :message="authorArticlesStore.error || lastLoadError"
      :recovery-message="loadRecovery"
      :retrying="isRetryingLoad"
      @retry="retryFetch"
    />

    <EmptyState
      v-else-if="authorArticlesStore.items.length === 0"
      title="当前没有匹配的文章"
      :message="`关键字：${authorArticlesStore.filters.keyword || '无'}，状态：${filteredStatusLabel}`"
    />

    <template v-else>
      <section class="surface-card author-articles-view__panel author-articles-view__panel--desktop">
        <div class="author-articles-view__table">
          <div class="author-articles-view__table-row author-articles-view__table-row--head">
            <span>标题</span>
            <span>状态</span>
            <span>更新时间</span>
            <span>操作</span>
          </div>

          <div v-for="item in authorArticlesStore.items" :key="item.id" class="author-articles-view__table-row">
            <span>{{ item.title }}</span>
            <span>{{ item.status === 'published' ? '已发布' : '草稿' }}</span>
            <span>{{ item.updatedAt }}</span>
            <div class="author-articles-view__operations">
              <RouterLink v-if="item.status === 'published'" :to="`/articles/${item.id}`">查看</RouterLink>
              <RouterLink :to="`/writer/articles/${item.id}/edit`">编辑</RouterLink>
              <button type="button" @click="openDeleteConfirm(item.id)">删除</button>
            </div>
          </div>
        </div>
      </section>

      <section class="author-articles-view__cards">
        <article v-for="item in authorArticlesStore.items" :key="item.id" class="surface-card author-articles-view__card">
          <p class="author-articles-view__card-status">{{ item.status === 'published' ? '已发布' : '草稿' }}</p>
          <h2 class="author-articles-view__card-title">{{ item.title }}</h2>
          <p class="author-articles-view__card-copy">{{ item.summary || '暂无摘要' }}</p>
          <div class="author-articles-view__operations">
            <RouterLink v-if="item.status === 'published'" :to="`/articles/${item.id}`">查看</RouterLink>
            <RouterLink :to="`/writer/articles/${item.id}/edit`">编辑</RouterLink>
            <button type="button" @click="openDeleteConfirm(item.id)">删除</button>
          </div>
        </article>
      </section>
    </template>

    <nav v-if="authorArticlesStore.pagination.totalPages > 1" class="surface-card author-articles-view__pagination" aria-label="作者文章分页">
      <button
        class="author-articles-view__page-button"
        type="button"
        :disabled="authorArticlesStore.pagination.page <= 1"
        @click="changePage(authorArticlesStore.pagination.page - 1)"
      >
        上一页
      </button>

      <div class="author-articles-view__page-list">
        <button
          v-for="page in visiblePages"
          :key="page"
          class="author-articles-view__page-button"
          :class="{ 'is-active': page === authorArticlesStore.pagination.page }"
          type="button"
          @click="changePage(page)"
        >
          {{ page }}
        </button>
      </div>

      <button
        class="author-articles-view__page-button"
        type="button"
        :disabled="authorArticlesStore.pagination.page >= authorArticlesStore.pagination.totalPages"
        @click="changePage(authorArticlesStore.pagination.page + 1)"
      >
        下一页
      </button>
    </nav>

    <ConfirmAction
      v-if="pendingDeleteId !== null"
      title="删除当前文章"
      message="删除后将从作者列表移除"
      :busy="isDeleting"
      @cancel="closeDeleteConfirm"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.author-articles-view {
  display: grid;
  gap: 1.5rem;
}

.author-articles-view__hero,
.author-articles-view__filters,
.author-articles-view__panel,
.author-articles-view__card,
.author-articles-view__pagination {
  padding: 1.5rem;
}

.author-articles-view__eyebrow,
.author-articles-view__title,
.author-articles-view__copy,
.author-articles-view__summary,
.author-articles-view__card-copy,
.author-articles-view__card-status,
.author-articles-view__global-error,
.author-articles-view__global-recovery,
.author-articles-view__card-title {
  margin: 0;
}

.author-articles-view__eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.author-articles-view__title {
  margin-top: 0.5rem;
  font-size: 1.8rem;
}

.author-articles-view__copy,
.author-articles-view__summary,
.author-articles-view__card-copy,
.author-articles-view__card-status {
  margin-top: 0.85rem;
  color: var(--color-muted);
}

.author-articles-view__global-error {
  color: var(--color-danger);
}

.author-articles-view__global-recovery {
  color: var(--color-muted);
  margin-top: -0.75rem;
}

.author-articles-view__filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  align-items: end;
}

.author-articles-view__field {
  display: grid;
  gap: 0.45rem;
}

.author-articles-view__field span {
  font-weight: 700;
}

.author-articles-view__field input,
.author-articles-view__field select {
  min-height: 2.9rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: var(--color-input-background);
  color: var(--color-text);
}

.author-articles-view__action {
  min-height: 2.9rem;
  border: 0;
  border-radius: 999px;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-weight: 700;
  cursor: pointer;
}

.author-articles-view__table {
  display: grid;
}

.author-articles-view__table-row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) 0.9fr 1.2fr 1.4fr;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--color-border);
  align-items: center;
}

.author-articles-view__table-row > span,
.author-articles-view__card-title,
.author-articles-view__card-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}

.author-articles-view__table-row--head {
  padding-top: 0;
  border-top: 0;
  font-weight: 700;
  color: var(--color-muted);
}

.author-articles-view__operations {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.author-articles-view__operations a,
.author-articles-view__operations button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-accent-strong);
  text-decoration: none;
  font-weight: 700;
  cursor: pointer;
}

.author-articles-view__cards {
  display: none;
}

.author-articles-view__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.author-articles-view__page-list {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.author-articles-view__page-button {
  min-width: 2.8rem;
  min-height: 2.8rem;
  padding: 0.75rem 0.95rem;
  border: 1px solid var(--color-border);
  border-radius: 999px;
  background: transparent;
  color: var(--color-text);
  font-weight: 700;
  cursor: pointer;
}

.author-articles-view__page-button.is-active {
  border-color: transparent;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
}

.author-articles-view__page-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.author-articles-view__card {
  display: grid;
  gap: 0.75rem;
}

.author-articles-view__card-title {
  font-size: 1.25rem;
}

@media (max-width: 900px) {
  .author-articles-view__filters {
    grid-template-columns: 1fr;
  }

  .author-articles-view__panel--desktop {
    display: none;
  }

  .author-articles-view__cards {
    display: grid;
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .author-articles-view__pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .author-articles-view__page-list {
    order: -1;
  }

  .author-articles-view__hero,
  .author-articles-view__filters,
  .author-articles-view__panel,
  .author-articles-view__card,
  .author-articles-view__pagination {
    padding: 1rem;
  }
}
</style>
