<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ArticleFormFields from '@/components/form/ArticleFormFields.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { useCategoriesStore } from '@/stores/categories'
import { useAuthorArticlesStore } from '@/stores/authorArticles'
import { useTagsStore } from '@/stores/tags'
import { useUserAuthStore } from '@/stores/userAuth'
import type { ArticleFormPayload } from '@/types/article'
import { validateArticlePayload } from '@/utils/article-form'
import { getUserToken } from '@/utils/auth-storage'
import { getRecoveryMessage, normalizeErrorMessage } from '@/utils/error-message'
import { parsePositiveRouteInteger } from '@/utils/route-params'

const route = useRoute()
const router = useRouter()
const authorArticlesStore = useAuthorArticlesStore()
const categoriesStore = useCategoriesStore()
const tagsStore = useTagsStore()
const userAuthStore = useUserAuthStore()

const form = reactive({
  title: '',
  summary: '',
  coverUrl: '',
  categoryIds: [] as number[],
  tagIds: [] as number[],
  contentMarkdown: '',
})

const submitErrors = ref<string[]>([])
const actionError = ref('')
const actionRecovery = ref('')
const loadRecovery = ref('')
const taxonomyRecovery = ref('')
const lastLoadError = ref('')
const lastLoadErrorArticleId = ref<number | null>(null)
const isRetryingLoad = ref(false)
const isRetryingTaxonomy = ref(false)
const isSubmitting = ref(false)
let latestInitialLoadSequence = 0
let latestTaxonomyLoadSequence = 0
let latestTaxonomyRetrySequence = 0

const articleId = computed(() => parsePositiveRouteInteger(route.params.id))
const isEditMode = computed(() => route.name === ROUTE_NAMES.authorArticleEdit)
const isInvalidEditId = computed(() => isEditMode.value && articleId.value === null)
const pageTitle = computed(() => (isEditMode.value ? '编辑文章' : '新建文章'))
const taxonomyError = computed(() => {
  const messages = [categoriesStore.error, tagsStore.error].filter(
    (message): message is string => Boolean(message),
  )

  return messages.length > 0 ? messages.join(' ') : ''
})

function applyArticleToForm() {
  if (!authorArticlesStore.currentArticle) {
    return
  }

  form.title = authorArticlesStore.currentArticle.title
  form.summary = authorArticlesStore.currentArticle.summary
  form.coverUrl = authorArticlesStore.currentArticle.coverUrl
  form.categoryIds = authorArticlesStore.currentArticle.categories.map((item) => item.id)
  form.tagIds = authorArticlesStore.currentArticle.tags.map((item) => item.id)
  form.contentMarkdown = authorArticlesStore.currentArticle.contentMarkdown
}

function resetForm() {
  form.title = ''
  form.summary = ''
  form.coverUrl = ''
  form.categoryIds = []
  form.tagIds = []
  form.contentMarkdown = ''
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

function isCurrentSubmitSession(requestToken: string | null) {
  return userAuthStore.token === requestToken && getUserToken() === requestToken
}

function createSubmitRouteSnapshot() {
  return {
    articleId: articleId.value,
    isEditMode: isEditMode.value,
    routeName: route.name,
  }
}

function isCurrentSubmitRoute(snapshot: ReturnType<typeof createSubmitRouteSnapshot>) {
  return (
    route.name === snapshot.routeName &&
    isEditMode.value === snapshot.isEditMode &&
    articleId.value === snapshot.articleId
  )
}

async function submit(status: 'draft' | 'published') {
  if (isSubmitting.value) {
    return
  }

  submitErrors.value = []
  actionError.value = ''
  actionRecovery.value = ''

  const payload = buildPayload(status)
  const validation = validateArticlePayload(payload)

  if (!validation.valid) {
    submitErrors.value = validation.errors
    return
  }

  isSubmitting.value = true
  const requestToken = getUserToken()
  const routeSnapshot = createSubmitRouteSnapshot()

  try {
    if (isEditMode.value) {
      const nextArticleId = articleId.value

      if (nextArticleId === null) {
        actionError.value = '无效的文章编号'
        return
      }

      await authorArticlesStore.updateArticle(nextArticleId, payload)
    } else {
      await authorArticlesStore.createArticle(payload)
    }

    if (!isCurrentSubmitSession(requestToken) || !isCurrentSubmitRoute(routeSnapshot)) {
      return
    }

    await router.push({ name: ROUTE_NAMES.authorArticles })
  } catch (caughtError) {
    if (!isCurrentSubmitSession(requestToken) || !isCurrentSubmitRoute(routeSnapshot)) {
      return
    }

    actionError.value = normalizeErrorMessage(caughtError, '保存文章失败')
    actionRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    isSubmitting.value = false
  }
}

async function loadInitialData() {
  const loadSequence = ++latestInitialLoadSequence
  const requestedIsEditMode = isEditMode.value
  const requestedArticleId = articleId.value
  const requestedIsInvalidEditId = requestedIsEditMode && requestedArticleId === null
  const shouldRetainLoadError = requestedIsEditMode &&
    requestedArticleId !== null &&
    lastLoadErrorArticleId.value === requestedArticleId &&
    !authorArticlesStore.currentArticle &&
    Boolean(authorArticlesStore.error || lastLoadError.value)

  isRetryingLoad.value = shouldRetainLoadError
  loadRecovery.value = ''

  if (requestedIsInvalidEditId) {
    resetForm()
    authorArticlesStore.currentArticle = null
    lastLoadError.value = '无效的文章编号'
    lastLoadErrorArticleId.value = null
    isRetryingLoad.value = false
    return
  }

  if (!requestedIsEditMode) {
    resetForm()
    authorArticlesStore.currentArticle = null
    lastLoadError.value = ''
    lastLoadErrorArticleId.value = null
  } else {
    authorArticlesStore.currentArticle = null
    if (!shouldRetainLoadError) {
      lastLoadError.value = ''
      lastLoadErrorArticleId.value = null
    }
  }

  const taxonomyLoadSequence = ++latestTaxonomyLoadSequence
  const taxonomyResults = await Promise.allSettled([categoriesStore.fetchAll(), tagsStore.fetchAll()])

  if (loadSequence !== latestInitialLoadSequence) {
    return
  }

  if (taxonomyLoadSequence === latestTaxonomyLoadSequence) {
    const taxonomyFailure = taxonomyResults.find((result) => result.status === 'rejected')
    taxonomyRecovery.value = taxonomyFailure ? getRecoveryMessage(taxonomyFailure.reason) : ''
  }

  if (loadSequence !== latestInitialLoadSequence) {
    return
  }

  if (requestedIsEditMode && requestedArticleId !== null) {
    try {
      await authorArticlesStore.fetchDetail(requestedArticleId)
      if (
        loadSequence !== latestInitialLoadSequence ||
        !isEditMode.value ||
        articleId.value !== requestedArticleId
      ) {
        return
      }

      applyArticleToForm()
      lastLoadError.value = ''
      lastLoadErrorArticleId.value = null
    } catch (caughtError) {
      if (
        loadSequence !== latestInitialLoadSequence ||
        !isEditMode.value ||
        articleId.value !== requestedArticleId
      ) {
        return
      }

      lastLoadError.value = authorArticlesStore.error ?? '获取文章详情失败'
      lastLoadErrorArticleId.value = requestedArticleId
      loadRecovery.value = getRecoveryMessage(caughtError)
      // The store exposes the user-facing error state for initial and retry loads.
    } finally {
      if (loadSequence === latestInitialLoadSequence) {
        isRetryingLoad.value = false
      }
    }
  } else {
    isRetryingLoad.value = false
  }
}

async function retryTaxonomy() {
  const retrySequence = ++latestTaxonomyRetrySequence
  const taxonomyLoadSequence = ++latestTaxonomyLoadSequence
  isRetryingTaxonomy.value = true

  try {
    const taxonomyResults = await Promise.allSettled([
      categoriesStore.fetchAll(true),
      tagsStore.fetchAll(true),
    ])

    if (taxonomyLoadSequence === latestTaxonomyLoadSequence) {
      const taxonomyFailure = taxonomyResults.find((result) => result.status === 'rejected')
      taxonomyRecovery.value = taxonomyFailure ? getRecoveryMessage(taxonomyFailure.reason) : ''
    }
  } finally {
    if (retrySequence === latestTaxonomyRetrySequence) {
      isRetryingTaxonomy.value = false
    }
  }
}

watch(
  () => [route.name, route.params.id],
  () => {
    void loadInitialData()
  },
  {
    immediate: true,
  },
)
</script>

<template>
  <section class="author-article-editor-view">
    <header class="surface-card author-article-editor-view__hero">
      <p class="author-article-editor-view__eyebrow">文章编辑模块</p>
      <h1 class="author-article-editor-view__title">{{ pageTitle }}</h1>
      <p class="author-article-editor-view__copy">填写内容，保存草稿或发布</p>
    </header>

    <LoadingState
      v-if="authorArticlesStore.loading && isEditMode && !authorArticlesStore.currentArticle && !lastLoadError"
      title="正在加载文章内容"
      message="加载文章详情"
    />

    <ErrorState
      v-else-if="(authorArticlesStore.error || lastLoadError) && isEditMode && (!authorArticlesStore.currentArticle || isInvalidEditId)"
      :message="authorArticlesStore.error || lastLoadError"
      :recovery-message="loadRecovery"
      :retrying="isRetryingLoad"
      @retry="loadInitialData"
    />

    <template v-else>
      <ArticleFormFields
        :form="form"
        :categories="categoriesStore.items"
        :tags="tagsStore.items"
        @update:field="updateField"
      />

      <section v-if="taxonomyError" class="surface-card author-article-editor-view__messages">
        <p class="author-article-editor-view__error" role="alert" aria-live="assertive">{{ taxonomyError }}</p>
        <p class="author-article-editor-view__recovery" role="status" aria-live="polite">
          {{ taxonomyRecovery || '分类或标签加载失败，请重试后再选择' }}
        </p>
        <button
          class="author-article-editor-view__inline-action"
          type="button"
          :disabled="isRetryingTaxonomy"
          @click="retryTaxonomy"
        >
          {{ isRetryingTaxonomy ? '正在重新加载' : '重新加载分类标签' }}
        </button>
      </section>

      <section v-if="submitErrors.length || actionError" class="surface-card author-article-editor-view__messages">
        <p v-for="message in submitErrors" :key="message" class="author-article-editor-view__error" role="alert" aria-live="assertive">{{ message }}</p>
        <p v-if="actionError" class="author-article-editor-view__error" role="alert" aria-live="assertive">{{ actionError }}</p>
        <p v-if="actionRecovery" class="author-article-editor-view__recovery" role="status" aria-live="polite">{{ actionRecovery }}</p>
      </section>

      <div class="author-article-editor-view__actions">
        <button class="author-article-editor-view__ghost" type="button" :disabled="isSubmitting" @click="submit('draft')">
          {{ isSubmitting ? '处理中' : '保存草稿' }}
        </button>
        <button class="author-article-editor-view__primary" type="button" :disabled="isSubmitting" @click="submit('published')">
          {{ isSubmitting ? '处理中' : '发布文章' }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.author-article-editor-view {
  display: grid;
  gap: 1.5rem;
}

.author-article-editor-view__hero,
.author-article-editor-view__messages {
  padding: 1.5rem;
}

.author-article-editor-view__eyebrow,
.author-article-editor-view__title,
.author-article-editor-view__copy,
.author-article-editor-view__error,
.author-article-editor-view__recovery {
  margin: 0;
}

.author-article-editor-view__eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.author-article-editor-view__title {
  margin-top: 0.5rem;
  font-size: 1.8rem;
}

.author-article-editor-view__copy {
  margin-top: 0.85rem;
  color: var(--color-muted);
}

.author-article-editor-view__messages {
  display: grid;
  gap: 0.5rem;
}

.author-article-editor-view__error {
  color: var(--color-danger);
}

.author-article-editor-view__recovery {
  color: var(--color-muted);
}

.author-article-editor-view__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.author-article-editor-view__ghost,
.author-article-editor-view__primary,
.author-article-editor-view__inline-action {
  min-height: 3rem;
  padding: 0.85rem 1.1rem;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

.author-article-editor-view__ghost,
.author-article-editor-view__inline-action {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
}

.author-article-editor-view__primary {
  border: 0;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
}

.author-article-editor-view__inline-action {
  width: fit-content;
}

@media (max-width: 720px) {
  .author-article-editor-view__actions {
    flex-direction: column;
  }
}
</style>
