<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import ConfirmAction from '@/components/common/ConfirmAction.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ArticleFormFields from '@/components/form/ArticleFormFields.vue'
import MarkdownRenderer from '@/components/public/MarkdownRenderer.vue'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { useAdminArticlesStore } from '@/stores/adminArticles'
import { useCategoriesStore } from '@/stores/categories'
import { useTagsStore } from '@/stores/tags'
import type { ArticleFormPayload } from '@/types/article'
import { validateArticlePayload } from '@/utils/article-form'
import { getAdminToken } from '@/utils/auth-storage'
import { getRecoveryMessage, normalizeErrorMessage } from '@/utils/error-message'

const adminAuthStore = useAdminAuthStore()
const adminArticlesStore = useAdminArticlesStore()
const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()

const pendingDeleteId = ref<number | null>(null)
const actionError = ref('')
const actionRecovery = ref('')
const loadRecovery = ref('')
const lastLoadError = ref('')
const isRetryingLoad = ref(false)
const detailLoading = ref(false)
const detailError = ref('')
const detailRecovery = ref('')
const submitErrors = ref<string[]>([])
const isSubmitting = ref(false)
const isDeleting = ref(false)
const detailMode = ref<'preview' | 'edit'>('preview')
const lastDetailRequest = ref<{ id: number; mode: 'preview' | 'edit' } | null>(null)
const taxonomyRecovery = ref('')
const isRetryingTaxonomy = ref(false)
let latestDetailRequestSequence = 0
let latestTaxonomyLoadSequence = 0
let latestTaxonomyRetrySequence = 0

const form = reactive({
  title: '',
  summary: '',
  coverUrl: '',
  categoryIds: [] as number[],
  tagIds: [] as number[],
  contentMarkdown: '',
})

const uniqueAuthors = computed(() => {
  const authorMap = new Map<number, { id: number; label: string }>()

  for (const item of adminArticlesStore.items) {
    if (!authorMap.has(item.authorId)) {
      authorMap.set(item.authorId, {
        id: item.authorId,
        label: item.author.nickname || item.author.username,
      })
    }
  }

  return Array.from(authorMap.values())
})

const filteredStatusLabel = computed(() =>
  adminArticlesStore.filters.status === 'published'
    ? '已发布'
    : adminArticlesStore.filters.status === 'draft'
      ? '草稿'
      : '全部',
)

const taxonomyError = computed(() => {
  const messages = [categoriesStore.error, tagsStore.error].filter(
    (message): message is string => Boolean(message),
  )

  return messages.length > 0 ? messages.join(' ') : ''
})

const selectedAuthorLabel = computed(() => {
  if (!adminArticlesStore.filters.authorId) {
    return '全部作者'
  }

  return uniqueAuthors.value.find((item) => item.id === adminArticlesStore.filters.authorId)?.label ?? '指定作者'
})

const visiblePages = computed(() => {
  const totalPages = Math.max(1, adminArticlesStore.pagination.totalPages)
  const currentPage = adminArticlesStore.pagination.page

  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, start + 4)
  const adjustedStart = Math.max(1, end - 4)

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index)
})

function applyArticleToForm() {
  if (!adminArticlesStore.currentArticle) {
    return
  }

  form.title = adminArticlesStore.currentArticle.title
  form.summary = adminArticlesStore.currentArticle.summary
  form.coverUrl = adminArticlesStore.currentArticle.coverUrl
  form.categoryIds = adminArticlesStore.currentArticle.categories.map((item) => item.id)
  form.tagIds = adminArticlesStore.currentArticle.tags.map((item) => item.id)
  form.contentMarkdown = adminArticlesStore.currentArticle.contentMarkdown
}

function clearSubmitFeedback() {
  if (isSubmitting.value) {
    return
  }

  submitErrors.value = []
  actionError.value = ''
  actionRecovery.value = ''
}

function updateField(field: string, value: string | number[]) {
  clearSubmitFeedback()

  if (field === 'categoryIds' || field === 'tagIds') {
    form[field] = value as number[]
    return
  }

  form[field as keyof typeof form] = value as never
}

function buildPayload(status: 'draft' | 'published'): ArticleFormPayload {
  return {
    status,
    title: form.title,
    summary: form.summary,
    coverUrl: form.coverUrl,
    categoryIds: [...form.categoryIds],
    tagIds: [...form.tagIds],
    contentMarkdown: form.contentMarkdown,
  } as ArticleFormPayload
}

function isCurrentAdminAction(requestToken: string | null) {
  return adminAuthStore.token === requestToken && getAdminToken() === requestToken
}

function createSubmitDetailSnapshot() {
  return {
    articleId: adminArticlesStore.currentArticle?.id ?? null,
    detailMode: detailMode.value,
    lastDetailRequestId: lastDetailRequest.value?.id ?? null,
    lastDetailRequestMode: lastDetailRequest.value?.mode ?? null,
  }
}

function isCurrentSubmitDetail(snapshot: ReturnType<typeof createSubmitDetailSnapshot>) {
  return (
    adminArticlesStore.currentArticle?.id === snapshot.articleId &&
    detailMode.value === snapshot.detailMode &&
    lastDetailRequest.value?.id === snapshot.lastDetailRequestId &&
    lastDetailRequest.value?.mode === snapshot.lastDetailRequestMode
  )
}

function clearCurrentArticleDetail() {
  adminArticlesStore.currentArticle = null
  lastDetailRequest.value = null
  detailError.value = ''
  detailRecovery.value = ''
  detailLoading.value = false
}

async function loadList() {
  actionError.value = ''
  actionRecovery.value = ''
  await adminArticlesStore.fetchList()
}

async function loadListSafely() {
  isRetryingLoad.value = adminArticlesStore.items.length === 0 && Boolean(adminArticlesStore.error || lastLoadError.value)

  try {
    await loadList()
    if (
      adminArticlesStore.currentArticle &&
      !adminArticlesStore.items.some((item) => item.id === adminArticlesStore.currentArticle?.id)
    ) {
      clearCurrentArticleDetail()
    }
    lastLoadError.value = ''
    loadRecovery.value = ''
    return true
  } catch (caughtError) {
    if (!adminArticlesStore.error) {
      return true
    }

    lastLoadError.value = adminArticlesStore.error ?? '获取全站文章失败'
    loadRecovery.value = getRecoveryMessage(caughtError)

    if (adminArticlesStore.items.length > 0) {
      actionError.value = normalizeErrorMessage(caughtError, '获取全站文章失败')
      actionRecovery.value = loadRecovery.value
    }

    return false
  } finally {
    isRetryingLoad.value = false
  }
}

async function loadTaxonomy(force = false) {
  const taxonomyLoadSequence = ++latestTaxonomyLoadSequence
  const taxonomyResults = await Promise.allSettled([
    categoriesStore.fetchAll(force),
    tagsStore.fetchAll(force),
  ])

  if (taxonomyLoadSequence === latestTaxonomyLoadSequence) {
    const taxonomyFailure = taxonomyResults.find((result) => result.status === 'rejected')
    taxonomyRecovery.value = taxonomyFailure ? getRecoveryMessage(taxonomyFailure.reason) : ''
  }
}

async function retryTaxonomy() {
  const retrySequence = ++latestTaxonomyRetrySequence
  isRetryingTaxonomy.value = true

  try {
    await loadTaxonomy(true)
  } finally {
    if (retrySequence === latestTaxonomyRetrySequence) {
      isRetryingTaxonomy.value = false
    }
  }
}

async function loadDetail(id: number, mode: 'preview' | 'edit' = 'preview') {
  const requestSequence = ++latestDetailRequestSequence
  actionError.value = ''
  actionRecovery.value = ''
  submitErrors.value = []
  lastDetailRequest.value = { id, mode }
  detailMode.value = mode
  detailLoading.value = true
  detailError.value = ''
  detailRecovery.value = ''
  if (adminArticlesStore.currentArticle?.id !== id) {
    adminArticlesStore.currentArticle = null
  }

  try {
    await adminArticlesStore.fetchDetail(id)
    if (
      requestSequence !== latestDetailRequestSequence ||
      lastDetailRequest.value?.id !== id ||
      lastDetailRequest.value?.mode !== mode
    ) {
      return
    }

    applyArticleToForm()
    detailError.value = ''
    detailRecovery.value = ''
  } catch (caughtError) {
    if (
      requestSequence !== latestDetailRequestSequence ||
      lastDetailRequest.value?.id !== id ||
      lastDetailRequest.value?.mode !== mode
    ) {
      return
    }

    detailError.value = normalizeErrorMessage(caughtError, '获取文章详情失败')
    detailRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    if (
      requestSequence === latestDetailRequestSequence &&
      lastDetailRequest.value?.id === id &&
      lastDetailRequest.value?.mode === mode
    ) {
      detailLoading.value = false
    }
  }
}

async function retryFetch() {
  await loadListSafely()
}

async function retryDetailLoad() {
  if (lastDetailRequest.value) {
    await loadDetail(lastDetailRequest.value.id, lastDetailRequest.value.mode)
    return
  }

  await retryFetch()
}

async function applyFilters() {
  const previousPage = adminArticlesStore.pagination.page
  adminArticlesStore.pagination.page = 1
  const loaded = await loadListSafely()

  if (!loaded) {
    adminArticlesStore.pagination.page = previousPage
  }
}

async function changePage(page: number) {
  const totalPages = Math.max(1, adminArticlesStore.pagination.totalPages)

  if (page < 1 || page > totalPages || page === adminArticlesStore.pagination.page) {
    return
  }

  const previousPage = adminArticlesStore.pagination.page
  adminArticlesStore.pagination.page = page
  const loaded = await loadListSafely()

  if (!loaded) {
    adminArticlesStore.pagination.page = previousPage
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

async function confirmDelete() {
  if (pendingDeleteId.value === null || isDeleting.value) {
    return
  }

  const articleId = pendingDeleteId.value
  isDeleting.value = true
  actionError.value = ''
  actionRecovery.value = ''
  const requestToken = getAdminToken()

  try {
    await adminArticlesStore.deleteArticle(articleId)
    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    if (lastDetailRequest.value?.id === articleId) {
      clearCurrentArticleDetail()
    }
    lastLoadError.value = ''
    loadRecovery.value = ''
  } catch (caughtError) {
    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    actionError.value = adminArticlesStore.error ?? normalizeErrorMessage(caughtError, '删除文章失败')
    actionRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    isDeleting.value = false
    if (isCurrentAdminAction(requestToken)) {
      closeDeleteConfirm()
    }
  }
}

async function submit(status: 'draft' | 'published') {
  if (isSubmitting.value) {
    return
  }

  if (!adminArticlesStore.currentArticle) {
    return
  }

  const payload = buildPayload(status)
  const validation = validateArticlePayload(payload)

  submitErrors.value = []
  actionError.value = ''
  actionRecovery.value = ''

  if (!validation.valid) {
    submitErrors.value = validation.errors
    return
  }

  isSubmitting.value = true
  const requestToken = getAdminToken()
  const detailSnapshot = createSubmitDetailSnapshot()

  try {
    await adminArticlesStore.updateArticle(adminArticlesStore.currentArticle.id, payload)
    if (!isCurrentAdminAction(requestToken) || !isCurrentSubmitDetail(detailSnapshot)) {
      return
    }

    detailMode.value = 'preview'
    detailError.value = ''
    detailRecovery.value = ''
  } catch (caughtError) {
    if (!isCurrentAdminAction(requestToken) || !isCurrentSubmitDetail(detailSnapshot)) {
      return
    }

    actionError.value = adminArticlesStore.error ?? normalizeErrorMessage(caughtError, '保存文章失败')
    actionRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(() => {
  void Promise.allSettled([loadTaxonomy(), loadListSafely()])
})
</script>

<template>
  <section class="admin-articles-view">
    <header class="surface-card admin-articles-view__hero">
      <div>
        <p class="admin-articles-view__eyebrow">全站文章治理</p>
        <h1 class="admin-articles-view__title">文章管理</h1>
        <p class="admin-articles-view__copy">筛选、查看、编辑或删除全站文章</p>
      </div>
    </header>

    <section class="surface-card admin-articles-view__filters">
      <label class="admin-articles-view__field">
        <span>作者</span>
        <select v-model="adminArticlesStore.filters.authorId">
          <option :value="undefined">全部作者</option>
          <option v-for="author in uniqueAuthors" :key="author.id" :value="author.id">{{ author.label }}</option>
        </select>
      </label>

      <label class="admin-articles-view__field">
        <span>状态</span>
        <select v-model="adminArticlesStore.filters.status">
          <option :value="undefined">全部</option>
          <option value="draft">草稿</option>
          <option value="published">已发布</option>
        </select>
      </label>

      <label class="admin-articles-view__field">
        <span>关键字</span>
        <input
          v-model="adminArticlesStore.filters.keyword"
          type="search"
          placeholder="搜索标题或摘要"
        />
      </label>

      <button class="admin-articles-view__action" type="button" @click="applyFilters">应用筛选</button>
    </section>

    <p v-if="actionError" class="admin-articles-view__global-error" role="alert" aria-live="assertive">{{ actionError }}</p>
    <p v-if="actionRecovery" class="admin-articles-view__global-recovery" role="status" aria-live="polite">{{ actionRecovery }}</p>

    <section v-if="taxonomyError" class="surface-card admin-articles-view__messages">
      <p class="admin-articles-view__error" role="alert" aria-live="assertive">{{ taxonomyError }}</p>
      <p class="admin-articles-view__recovery" role="status" aria-live="polite">
        {{ taxonomyRecovery || '分类或标签加载失败，请重试后再选择' }}
      </p>
      <button
        class="admin-articles-view__inline-action"
        type="button"
        :disabled="isRetryingTaxonomy"
        @click="retryTaxonomy"
      >
        {{ isRetryingTaxonomy ? '正在重新加载' : '重新加载分类标签' }}
      </button>
    </section>

    <LoadingState v-if="adminArticlesStore.loading && adminArticlesStore.items.length === 0 && !lastLoadError" />

    <ErrorState
      v-else-if="(adminArticlesStore.error || lastLoadError) && adminArticlesStore.items.length === 0"
      :message="adminArticlesStore.error || lastLoadError"
      :recovery-message="loadRecovery"
      :retrying="isRetryingLoad"
      @retry="retryFetch"
    />

    <EmptyState
      v-else-if="adminArticlesStore.items.length === 0"
      title="当前没有匹配的文章"
      :message="`作者：${selectedAuthorLabel}，状态：${filteredStatusLabel}，关键字：${adminArticlesStore.filters.keyword || '无'}`"
    />

    <div v-else class="admin-articles-view__layout">
      <section class="surface-card admin-articles-view__panel admin-articles-view__panel--desktop">
        <div class="admin-articles-view__table">
          <div class="admin-articles-view__table-row admin-articles-view__table-row--head">
            <span>标题</span>
            <span>作者</span>
            <span>状态</span>
            <span>更新时间</span>
            <span>操作</span>
          </div>

          <div v-for="item in adminArticlesStore.items" :key="item.id" class="admin-articles-view__table-row">
            <span>{{ item.title }}</span>
            <span>{{ item.author.nickname || item.author.username }}</span>
            <span>{{ item.status === 'published' ? '已发布' : '草稿' }}</span>
            <span>{{ item.updatedAt }}</span>
            <div class="admin-articles-view__operations">
              <button type="button" @click="loadDetail(item.id, 'preview')">查看</button>
              <button type="button" @click="loadDetail(item.id, 'edit')">编辑</button>
              <button type="button" @click="openDeleteConfirm(item.id)">删除</button>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-articles-view__cards">
        <article v-for="item in adminArticlesStore.items" :key="item.id" class="surface-card admin-articles-view__card">
          <p class="admin-articles-view__card-status">{{ item.status === 'published' ? '已发布' : '草稿' }}</p>
          <h2 class="admin-articles-view__card-title">{{ item.title }}</h2>
          <p class="admin-articles-view__card-copy">作者：{{ item.author.nickname || item.author.username }}</p>
          <p class="admin-articles-view__card-copy">{{ item.summary || '暂无摘要' }}</p>
          <div class="admin-articles-view__operations">
            <button type="button" @click="loadDetail(item.id, 'preview')">查看</button>
            <button type="button" @click="loadDetail(item.id, 'edit')">编辑</button>
            <button type="button" @click="openDeleteConfirm(item.id)">删除</button>
          </div>
        </article>
      </section>

      <aside class="surface-card admin-articles-view__detail">
        <LoadingState
          v-if="detailLoading && !adminArticlesStore.currentArticle"
          title="正在加载文章详情"
          message="同步文章内容"
        />

        <ErrorState
          v-else-if="detailError && !adminArticlesStore.currentArticle"
          title="文章详情加载失败"
          :message="detailError"
          :recovery-message="detailRecovery"
          :retrying="detailLoading"
          @retry="retryDetailLoad"
        />

        <template v-else-if="adminArticlesStore.currentArticle">
          <p v-if="detailError" class="admin-articles-view__detail-error" role="alert" aria-live="assertive">{{ detailError }}</p>
          <p v-if="detailRecovery" class="admin-articles-view__detail-recovery" role="status" aria-live="polite">{{ detailRecovery }}</p>
          <div class="admin-articles-view__detail-header">
            <div>
              <p class="admin-articles-view__eyebrow">当前文章</p>
              <h2 class="admin-articles-view__detail-title">{{ adminArticlesStore.currentArticle.title }}</h2>
              <p class="admin-articles-view__detail-copy">
                作者：{{ adminArticlesStore.currentArticle.author.nickname || adminArticlesStore.currentArticle.author.username }}
              </p>
            </div>

            <div class="admin-articles-view__detail-switch">
              <button type="button" :class="{ 'is-active': detailMode === 'preview' }" @click="detailMode = 'preview'">预览</button>
              <button type="button" :class="{ 'is-active': detailMode === 'edit' }" @click="detailMode = 'edit'">编辑</button>
            </div>
          </div>

          <template v-if="detailMode === 'preview'">
            <p class="admin-articles-view__detail-copy">{{ adminArticlesStore.currentArticle.summary || '暂无摘要' }}</p>
            <MarkdownRenderer :model-value="adminArticlesStore.currentArticle.contentMarkdown" />
          </template>

          <template v-else>
            <ArticleFormFields
              :form="form"
              :categories="categoriesStore.items"
              :tags="tagsStore.items"
              @update:field="updateField"
            />

            <section v-if="submitErrors.length || actionError" class="admin-articles-view__messages">
              <p v-for="message in submitErrors" :key="message" class="admin-articles-view__error">{{ message }}</p>
              <p v-if="actionError" class="admin-articles-view__error" role="alert" aria-live="assertive">{{ actionError }}</p>
              <p v-if="actionRecovery" class="admin-articles-view__recovery" role="status" aria-live="polite">{{ actionRecovery }}</p>
            </section>

            <div class="admin-articles-view__submit-actions">
              <button class="admin-articles-view__ghost" type="button" :disabled="isSubmitting" @click="submit('draft')">
                {{ isSubmitting ? '处理中' : '保存草稿' }}
              </button>
              <button class="admin-articles-view__primary" type="button" :disabled="isSubmitting" @click="submit('published')">
                {{ isSubmitting ? '处理中' : '保存并发布' }}
              </button>
            </div>
          </template>
        </template>

        <EmptyState
          v-else
          title="请选择一篇文章"
          message="查看或编辑任意作者文章时，详情面板会在这里展开"
        />
      </aside>
    </div>

    <nav v-if="adminArticlesStore.pagination.totalPages > 1" class="surface-card admin-articles-view__pagination" aria-label="管理员文章分页">
      <button
        class="admin-articles-view__page-button"
        type="button"
        :disabled="adminArticlesStore.pagination.page <= 1"
        @click="changePage(adminArticlesStore.pagination.page - 1)"
      >
        上一页
      </button>

      <div class="admin-articles-view__page-list">
        <button
          v-for="page in visiblePages"
          :key="page"
          class="admin-articles-view__page-button"
          :class="{ 'is-active': page === adminArticlesStore.pagination.page }"
          type="button"
          @click="changePage(page)"
        >
          {{ page }}
        </button>
      </div>

      <button
        class="admin-articles-view__page-button"
        type="button"
        :disabled="adminArticlesStore.pagination.page >= adminArticlesStore.pagination.totalPages"
        @click="changePage(adminArticlesStore.pagination.page + 1)"
      >
        下一页
      </button>
    </nav>

    <ConfirmAction
      v-if="pendingDeleteId !== null"
      title="删除当前文章"
      message="删除后将立即从全站文章列表移除"
      :busy="isDeleting"
      @cancel="closeDeleteConfirm"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.admin-articles-view {
  display: grid;
  gap: 1.5rem;
}

.admin-articles-view__hero,
.admin-articles-view__filters,
.admin-articles-view__panel,
.admin-articles-view__card,
.admin-articles-view__detail,
.admin-articles-view__messages,
.admin-articles-view__pagination {
  padding: 1.5rem;
}

.admin-articles-view__eyebrow,
.admin-articles-view__title,
.admin-articles-view__copy,
.admin-articles-view__card-status,
.admin-articles-view__card-title,
.admin-articles-view__card-copy,
.admin-articles-view__detail-title,
.admin-articles-view__detail-copy,
.admin-articles-view__global-error,
.admin-articles-view__global-recovery,
.admin-articles-view__detail-error,
.admin-articles-view__detail-recovery,
.admin-articles-view__error,
.admin-articles-view__recovery {
  margin: 0;
}

.admin-articles-view__eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.admin-articles-view__title {
  margin-top: 0.5rem;
  font-size: 1.8rem;
}

.admin-articles-view__copy,
.admin-articles-view__card-status,
.admin-articles-view__card-copy,
.admin-articles-view__detail-copy {
  margin-top: 0.85rem;
  color: var(--color-muted);
}

.admin-articles-view__global-error {
  color: var(--color-danger);
}

.admin-articles-view__global-recovery,
.admin-articles-view__detail-recovery,
.admin-articles-view__recovery {
  color: var(--color-muted);
}

.admin-articles-view__detail-error {
  color: var(--color-danger);
}

.admin-articles-view__filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  align-items: end;
}

.admin-articles-view__field {
  display: grid;
  gap: 0.45rem;
  min-width: 0;
  overflow: hidden;
}

.admin-articles-view__field span {
  font-weight: 700;
}

.admin-articles-view__field input,
.admin-articles-view__field select {
  min-width: 0;
  min-height: 2.9rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: var(--color-input-background);
  color: var(--color-text);
}

.admin-articles-view__action,
.admin-articles-view__ghost,
.admin-articles-view__primary,
.admin-articles-view__inline-action,
.admin-articles-view__detail-switch button {
  min-height: 2.9rem;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

.admin-articles-view__action,
.admin-articles-view__primary {
  border: 0;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
}

.admin-articles-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.45fr) minmax(21rem, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.admin-articles-view__table {
  display: grid;
}

.admin-articles-view__table-row {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) 1fr 0.8fr 1fr 1.2fr;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--color-border);
  align-items: center;
}

.admin-articles-view__table-row > span,
.admin-articles-view__card-title,
.admin-articles-view__card-copy,
.admin-articles-view__detail-title,
.admin-articles-view__detail-copy {
  min-width: 0;
  overflow-wrap: anywhere;
}

.admin-articles-view__table-row--head {
  padding-top: 0;
  border-top: 0;
  font-weight: 700;
  color: var(--color-muted);
}

.admin-articles-view__operations {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.admin-articles-view__operations button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-accent-strong);
  font-weight: 700;
  cursor: pointer;
}

.admin-articles-view__cards {
  display: none;
}

.admin-articles-view__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.admin-articles-view__page-list {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.admin-articles-view__page-button {
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

.admin-articles-view__page-button.is-active {
  border-color: transparent;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
}

.admin-articles-view__page-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.admin-articles-view__card {
  display: grid;
  gap: 0.75rem;
}

.admin-articles-view__card-title {
  font-size: 1.25rem;
}

.admin-articles-view__detail {
  display: grid;
  gap: 1rem;
}

.admin-articles-view__detail-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.admin-articles-view__detail-switch {
  display: inline-flex;
  gap: 0.5rem;
}

.admin-articles-view__detail-switch button {
  min-width: 4.5rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
}

.admin-articles-view__detail-switch button.is-active {
  border-color: transparent;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
}

.admin-articles-view__messages {
  display: grid;
  gap: 0.5rem;
  padding: 0;
}

.admin-articles-view__error {
  color: var(--color-danger);
}

.admin-articles-view__submit-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.admin-articles-view__ghost {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
}

.admin-articles-view__inline-action {
  width: fit-content;
  padding: 0.85rem 1.1rem;
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
}

.admin-articles-view__inline-action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

@media (max-width: 1100px) {
  .admin-articles-view__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .admin-articles-view__filters {
    grid-template-columns: 1fr;
  }

  .admin-articles-view__panel--desktop {
    display: none;
  }

  .admin-articles-view__cards {
    display: grid;
    gap: 1rem;
  }
}

@media (max-width: 720px) {
  .admin-articles-view__detail-header,
  .admin-articles-view__submit-actions {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .admin-articles-view__pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-articles-view__page-list {
    order: -1;
  }

  .admin-articles-view__hero,
  .admin-articles-view__filters,
  .admin-articles-view__panel,
  .admin-articles-view__card,
  .admin-articles-view__detail,
  .admin-articles-view__pagination {
    padding: 1rem;
  }
}
</style>
