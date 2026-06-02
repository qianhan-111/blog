<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import { createCategory, deleteCategory, updateCategory } from '@/api/categories'
import ConfirmAction from '@/components/common/ConfirmAction.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { useCategoriesStore } from '@/stores/categories'
import { getAdminToken } from '@/utils/auth-storage'
import { getRecoveryMessage, normalizeErrorMessage } from '@/utils/error-message'

const adminAuthStore = useAdminAuthStore()
const categoriesStore = useCategoriesStore()

const form = reactive({
  id: null as number | null,
  name: '',
  description: '',
})

const formMode = ref<'create' | 'edit'>('create')
const actionError = ref('')
const actionRecovery = ref('')
const loadRecovery = ref('')
const lastLoadError = ref('')
const isRetryingLoad = ref(false)
const pendingDelete = ref<{ id: number; name: string } | null>(null)
const isSubmitting = ref(false)
const isDeleting = ref(false)

const pageTitle = computed(() => (formMode.value === 'create' ? '新增分类' : '编辑分类'))

function resetForm() {
  form.id = null
  form.name = ''
  form.description = ''
  formMode.value = 'create'
  actionError.value = ''
  actionRecovery.value = ''
}

function fillForm(id: number, name: string, description: string) {
  form.id = id
  form.name = name
  form.description = description
  formMode.value = 'edit'
  actionError.value = ''
  actionRecovery.value = ''
}

function clearActionFeedback() {
  if (isSubmitting.value) {
    return
  }

  actionError.value = ''
  actionRecovery.value = ''
}

async function loadCategories(force = false) {
  actionError.value = ''
  actionRecovery.value = ''
  await categoriesStore.fetchAll(force)
}

async function loadCategoriesSafely(force = false) {
  isRetryingLoad.value = categoriesStore.items.length === 0 && Boolean(categoriesStore.error || lastLoadError.value)

  try {
    await loadCategories(force)
    lastLoadError.value = ''
    loadRecovery.value = ''
  } catch (caughtError) {
    if (!categoriesStore.error) {
      return
    }

    lastLoadError.value = categoriesStore.error ?? '获取分类列表失败'
    loadRecovery.value = getRecoveryMessage(caughtError)
    // The store exposes the user-facing error state for initial and retry loads.
  } finally {
    isRetryingLoad.value = false
  }
}

function isCurrentAdminAction(requestToken: string | null) {
  return adminAuthStore.token === requestToken && getAdminToken() === requestToken
}

function createSubmitFormSnapshot() {
  return {
    description: form.description,
    id: form.id,
    mode: formMode.value,
    name: form.name,
  }
}

function isCurrentSubmitForm(snapshot: ReturnType<typeof createSubmitFormSnapshot>) {
  return (
    form.id === snapshot.id &&
    formMode.value === snapshot.mode &&
    form.name === snapshot.name &&
    form.description === snapshot.description
  )
}

async function submitForm() {
  if (isSubmitting.value) {
    return
  }

  const name = form.name.trim()
  const description = form.description.trim()

  actionRecovery.value = ''

  if (!name) {
    actionError.value = '分类名称不能为空'
    return
  }

  isSubmitting.value = true
  actionError.value = ''
  const requestToken = getAdminToken()
  const formSnapshot = createSubmitFormSnapshot()

  try {
    if (formMode.value === 'edit' && form.id !== null) {
      await updateCategory(form.id, {
        name,
        description,
      })
    } else {
      await createCategory({
        name,
        description,
      })
    }

    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    const shouldUpdateSubmittedForm = isCurrentSubmitForm(formSnapshot)
    if (shouldUpdateSubmittedForm) {
      resetForm()
    }

    try {
      await loadCategories(true)
    } catch (reloadError) {
      if (!isCurrentAdminAction(requestToken)) {
        return
      }

      if (!shouldUpdateSubmittedForm || !categoriesStore.error) {
        return
      }

      actionError.value = `分类已保存，但列表刷新失败：${normalizeErrorMessage(reloadError, '获取分类列表失败')}`
      actionRecovery.value = getRecoveryMessage(reloadError)
    }
  } catch (caughtError) {
    if (!isCurrentAdminAction(requestToken) || !isCurrentSubmitForm(formSnapshot)) {
      return
    }

    adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
    actionError.value = normalizeErrorMessage(caughtError, '分类保存失败')
    actionRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    isSubmitting.value = false
  }
}

function openDeleteConfirm(id: number, name: string) {
  pendingDelete.value = { id, name }
}

function closeDeleteConfirm() {
  if (isDeleting.value) {
    return
  }

  pendingDelete.value = null
}

async function confirmDelete() {
  if (!pendingDelete.value || isDeleting.value) {
    return
  }

  const categoryToDelete = pendingDelete.value
  isDeleting.value = true
  actionError.value = ''
  actionRecovery.value = ''
  const requestToken = getAdminToken()

  try {
    await deleteCategory(categoryToDelete.id)

    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    try {
      await loadCategories(true)
      if (form.id === categoryToDelete.id) {
        resetForm()
      }
    } catch (reloadError) {
      if (!isCurrentAdminAction(requestToken)) {
        return
      }

      if (form.id === categoryToDelete.id) {
        resetForm()
      }

      if (!categoriesStore.error) {
        return
      }

      actionError.value = `分类已删除，但列表刷新失败：${normalizeErrorMessage(reloadError, '获取分类列表失败')}`
      actionRecovery.value = getRecoveryMessage(reloadError)
    }
  } catch (caughtError) {
    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
    actionError.value = normalizeErrorMessage(caughtError, '分类删除失败')
    actionRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    isDeleting.value = false
    if (isCurrentAdminAction(requestToken)) {
      pendingDelete.value = null
    }
  }
}

onMounted(() => {
  void loadCategoriesSafely()
})
</script>

<template>
  <section class="taxonomy-view">
    <header class="surface-card taxonomy-view__hero">
      <p class="taxonomy-view__eyebrow">后台内容结构</p>
      <h1 class="taxonomy-view__title">分类管理</h1>
      <p class="taxonomy-view__copy">维护文章分类</p>
    </header>

    <div class="taxonomy-view__layout">
      <section class="surface-card taxonomy-view__form">
        <p class="taxonomy-view__eyebrow">{{ pageTitle }}</p>

        <label class="taxonomy-view__field">
          <span>分类名称</span>
          <input v-model="form.name" type="text" placeholder="例如：Vue 3" @input="clearActionFeedback" />
        </label>

        <label class="taxonomy-view__field">
          <span>分类说明</span>
          <textarea
            v-model="form.description"
            rows="5"
            placeholder="简要说明该分类适合收纳哪些文章"
            @input="clearActionFeedback"
          />
        </label>

        <p v-if="actionError" class="taxonomy-view__error">{{ actionError }}</p>
        <p v-if="actionRecovery" class="taxonomy-view__recovery">{{ actionRecovery }}</p>

        <div class="taxonomy-view__actions">
          <button class="taxonomy-view__ghost" type="button" @click="resetForm">重置</button>
          <button class="taxonomy-view__primary" type="button" :disabled="isSubmitting" @click="submitForm">
            {{ isSubmitting ? '处理中' : formMode === 'edit' ? '保存分类' : '创建分类' }}
          </button>
        </div>
      </section>

      <section class="taxonomy-view__list">
        <LoadingState v-if="categoriesStore.loading && categoriesStore.items.length === 0 && !lastLoadError" />

        <ErrorState
          v-else-if="(categoriesStore.error || lastLoadError) && categoriesStore.items.length === 0"
          :message="categoriesStore.error || lastLoadError"
          :recovery-message="loadRecovery"
          :retrying="isRetryingLoad"
          @retry="loadCategoriesSafely(true)"
        />

        <EmptyState
          v-else-if="categoriesStore.items.length === 0"
          title="当前还没有分类"
          message="创建后，作者编辑文章时即可在多选分类中使用"
        />

        <section v-else class="surface-card taxonomy-view__panel">
          <article v-for="category in categoriesStore.items" :key="category.id" class="taxonomy-view__item">
            <div>
              <h2 class="taxonomy-view__item-title">{{ category.name }}</h2>
              <p class="taxonomy-view__item-copy">{{ category.description || '暂无分类说明' }}</p>
            </div>

            <div class="taxonomy-view__item-actions">
              <button type="button" @click="fillForm(category.id, category.name, category.description)">编辑</button>
              <button type="button" @click="openDeleteConfirm(category.id, category.name)">删除</button>
            </div>
          </article>
        </section>
      </section>
    </div>

    <ConfirmAction
      v-if="pendingDelete"
      title="删除当前分类"
      :message="`确认删除分类「${pendingDelete.name}」 若被文章引用，删除会失败`"
      :busy="isDeleting"
      @cancel="closeDeleteConfirm"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.taxonomy-view {
  display: grid;
  gap: 1.5rem;
}

.taxonomy-view__hero,
.taxonomy-view__form,
.taxonomy-view__panel {
  padding: 1.5rem;
}

.taxonomy-view__eyebrow,
.taxonomy-view__title,
.taxonomy-view__copy,
.taxonomy-view__item-title,
.taxonomy-view__item-copy,
.taxonomy-view__error {
  margin: 0;
}

.taxonomy-view__eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.taxonomy-view__title {
  margin-top: 0.5rem;
  font-size: 1.8rem;
}

.taxonomy-view__copy,
.taxonomy-view__item-copy {
  margin-top: 0.85rem;
  color: var(--color-muted);
}

.taxonomy-view__recovery {
  margin: -0.5rem 0 0;
  color: var(--color-muted);
}

.taxonomy-view__layout {
  display: grid;
  grid-template-columns: minmax(19rem, 24rem) minmax(0, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.taxonomy-view__form {
  display: grid;
  gap: 1rem;
}

.taxonomy-view__field {
  display: grid;
  gap: 0.45rem;
}

.taxonomy-view__field span {
  font-weight: 700;
}

.taxonomy-view__field input,
.taxonomy-view__field textarea {
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: var(--color-input-background);
  color: var(--color-text);
}

.taxonomy-view__error {
  color: var(--color-danger);
}

.taxonomy-view__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.taxonomy-view__ghost,
.taxonomy-view__primary {
  min-height: 2.9rem;
  padding: 0.8rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

.taxonomy-view__ghost {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
}

.taxonomy-view__primary {
  border: 0;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
}

.taxonomy-view__list {
  display: grid;
}

.taxonomy-view__panel {
  display: grid;
  gap: 1rem;
}

.taxonomy-view__item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.taxonomy-view__item:first-child {
  padding-top: 0;
  border-top: 0;
}

.taxonomy-view__item-title {
  font-size: 1.15rem;
}

.taxonomy-view__item-actions {
  display: flex;
  gap: 0.75rem;
}

.taxonomy-view__item-actions button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-accent-strong);
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 900px) {
  .taxonomy-view__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .taxonomy-view__item,
  .taxonomy-view__actions {
    flex-direction: column;
  }
}
</style>
