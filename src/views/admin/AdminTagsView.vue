<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import { createTag, deleteTag, updateTag } from '@/api/tags'
import ConfirmAction from '@/components/common/ConfirmAction.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import { useAdminAuthStore } from '@/stores/adminAuth'
import { useTagsStore } from '@/stores/tags'
import { getAdminToken } from '@/utils/auth-storage'
import { getRecoveryMessage, normalizeErrorMessage } from '@/utils/error-message'

const adminAuthStore = useAdminAuthStore()
const tagsStore = useTagsStore()

const form = reactive({
  id: null as number | null,
  name: '',
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

const pageTitle = computed(() => (formMode.value === 'create' ? '新增标签' : '编辑标签'))

function resetForm() {
  form.id = null
  form.name = ''
  formMode.value = 'create'
  actionError.value = ''
  actionRecovery.value = ''
}

function fillForm(id: number, name: string) {
  form.id = id
  form.name = name
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

async function loadTags(force = false) {
  actionError.value = ''
  actionRecovery.value = ''
  await tagsStore.fetchAll(force)
}

async function loadTagsSafely(force = false) {
  isRetryingLoad.value = tagsStore.items.length === 0 && Boolean(tagsStore.error || lastLoadError.value)

  try {
    await loadTags(force)
    lastLoadError.value = ''
    loadRecovery.value = ''
  } catch (caughtError) {
    if (!tagsStore.error) {
      return
    }

    lastLoadError.value = tagsStore.error ?? '获取标签列表失败'
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
    id: form.id,
    mode: formMode.value,
    name: form.name,
  }
}

function isCurrentSubmitForm(snapshot: ReturnType<typeof createSubmitFormSnapshot>) {
  return (
    form.id === snapshot.id &&
    formMode.value === snapshot.mode &&
    form.name === snapshot.name
  )
}

async function submitForm() {
  if (isSubmitting.value) {
    return
  }

  const name = form.name.trim()

  actionRecovery.value = ''

  if (!name) {
    actionError.value = '标签名称不能为空'
    return
  }

  isSubmitting.value = true
  actionError.value = ''
  const requestToken = getAdminToken()
  const formSnapshot = createSubmitFormSnapshot()

  try {
    if (formMode.value === 'edit' && form.id !== null) {
      await updateTag(form.id, { name })
    } else {
      await createTag({ name })
    }

    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    const shouldUpdateSubmittedForm = isCurrentSubmitForm(formSnapshot)
    if (shouldUpdateSubmittedForm) {
      resetForm()
    }

    try {
      await loadTags(true)
    } catch (reloadError) {
      if (!isCurrentAdminAction(requestToken)) {
        return
      }

      if (!shouldUpdateSubmittedForm || !tagsStore.error) {
        return
      }

      actionError.value = `标签已保存，但列表刷新失败：${normalizeErrorMessage(reloadError, '获取标签列表失败')}`
      actionRecovery.value = getRecoveryMessage(reloadError)
    }
  } catch (caughtError) {
    if (!isCurrentAdminAction(requestToken) || !isCurrentSubmitForm(formSnapshot)) {
      return
    }

    adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
    actionError.value = normalizeErrorMessage(caughtError, '标签保存失败')
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

  const tagToDelete = pendingDelete.value
  isDeleting.value = true
  actionError.value = ''
  actionRecovery.value = ''
  const requestToken = getAdminToken()

  try {
    await deleteTag(tagToDelete.id)

    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    try {
      await loadTags(true)
      if (form.id === tagToDelete.id) {
        resetForm()
      }
    } catch (reloadError) {
      if (!isCurrentAdminAction(requestToken)) {
        return
      }

      if (form.id === tagToDelete.id) {
        resetForm()
      }

      if (!tagsStore.error) {
        return
      }

      actionError.value = `标签已删除，但列表刷新失败：${normalizeErrorMessage(reloadError, '获取标签列表失败')}`
      actionRecovery.value = getRecoveryMessage(reloadError)
    }
  } catch (caughtError) {
    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
    actionError.value = normalizeErrorMessage(caughtError, '标签删除失败')
    actionRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    isDeleting.value = false
    if (isCurrentAdminAction(requestToken)) {
      pendingDelete.value = null
    }
  }
}

onMounted(() => {
  void loadTagsSafely()
})
</script>

<template>
  <section class="taxonomy-view">
    <header class="surface-card taxonomy-view__hero">
      <p class="taxonomy-view__eyebrow">后台内容结构</p>
      <h1 class="taxonomy-view__title">标签管理</h1>
      <p class="taxonomy-view__copy">维护文章标签</p>
    </header>

    <div class="taxonomy-view__layout">
      <section class="surface-card taxonomy-view__form">
        <p class="taxonomy-view__eyebrow">{{ pageTitle }}</p>

        <label class="taxonomy-view__field">
          <span>标签名称</span>
          <input v-model="form.name" type="text" placeholder="例如：Pinia" @input="clearActionFeedback" />
        </label>

        <p v-if="actionError" class="taxonomy-view__error">{{ actionError }}</p>
        <p v-if="actionRecovery" class="taxonomy-view__recovery">{{ actionRecovery }}</p>

        <div class="taxonomy-view__actions">
          <button class="taxonomy-view__ghost" type="button" @click="resetForm">重置</button>
          <button class="taxonomy-view__primary" type="button" :disabled="isSubmitting" @click="submitForm">
            {{ isSubmitting ? '处理中' : formMode === 'edit' ? '保存标签' : '创建标签' }}
          </button>
        </div>
      </section>

      <section class="taxonomy-view__list">
        <LoadingState v-if="tagsStore.loading && tagsStore.items.length === 0 && !lastLoadError" />

        <ErrorState
          v-else-if="(tagsStore.error || lastLoadError) && tagsStore.items.length === 0"
          :message="tagsStore.error || lastLoadError"
          :recovery-message="loadRecovery"
          :retrying="isRetryingLoad"
          @retry="loadTagsSafely(true)"
        />

        <EmptyState
          v-else-if="tagsStore.items.length === 0"
          title="当前还没有标签"
          message="创建后，作者编辑文章时即可在标签多选中使用"
        />

        <section v-else class="surface-card taxonomy-view__panel">
          <article v-for="tag in tagsStore.items" :key="tag.id" class="taxonomy-view__item">
            <div>
              <h2 class="taxonomy-view__item-title">{{ tag.name }}</h2>
              <p class="taxonomy-view__item-copy">创建时间：{{ tag.createdAt || '未提供' }}</p>
            </div>

            <div class="taxonomy-view__item-actions">
              <button type="button" @click="fillForm(tag.id, tag.name)">编辑</button>
              <button type="button" @click="openDeleteConfirm(tag.id, tag.name)">删除</button>
            </div>
          </article>
        </section>
      </section>
    </div>

    <ConfirmAction
      v-if="pendingDelete"
      title="删除当前标签"
      :message="`确认删除标签「${pendingDelete.name}」 若被文章引用，删除会失败`"
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

.taxonomy-view__field input {
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
