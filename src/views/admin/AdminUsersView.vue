<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import {
  deleteAdminUser,
  getAdminUserDetail,
  getAdminUsers,
  updateAdminUserStatus,
} from '@/api/users'
import ConfirmAction from '@/components/common/ConfirmAction.vue'
import EmptyState from '@/components/common/EmptyState.vue'
import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import { useAdminAuthStore } from '@/stores/adminAuth'
import type { UserProfile, UserStatus } from '@/types/user'
import { getAdminToken } from '@/utils/auth-storage'
import { getRecoveryMessage, normalizeErrorMessage } from '@/utils/error-message'

const adminAuthStore = useAdminAuthStore()
const items = ref<UserProfile[]>([])
const selectedUser = ref<UserProfile | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
const detailLoading = ref(false)
const detailError = ref('')
const detailRecovery = ref('')
const actionError = ref('')
const actionRecovery = ref('')
const loadRecovery = ref('')
const lastLoadError = ref('')
const isRetryingLoad = ref(false)
const lastDetailRequestId = ref<number | null>(null)
let latestListRequestSequence = 0
let latestDetailRequestSequence = 0

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0,
  totalPages: 0,
})

const filters = reactive<{
  keyword: string
  status?: UserStatus
}>({
  keyword: '',
  status: undefined,
})

const pendingDelete = ref<{ id: number; username: string } | null>(null)
const actionLoadingIds = ref<Set<number>>(new Set())
const isDeleting = ref(false)

function isActionLoading(userId: number) {
  return actionLoadingIds.value.has(userId)
}

function setActionLoading(userId: number, loading: boolean) {
  const nextIds = new Set(actionLoadingIds.value)

  if (loading) {
    nextIds.add(userId)
  } else {
    nextIds.delete(userId)
  }

  actionLoadingIds.value = nextIds
}

function clearSelectedUserDetail() {
  selectedUser.value = null
  lastDetailRequestId.value = null
  detailError.value = ''
  detailRecovery.value = ''
  detailLoading.value = false
}

function buildParams() {
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
    ...(filters.status ? { status: filters.status } : {}),
  }
}

function matchesActiveFilters(user: UserProfile) {
  const keyword = filters.keyword.trim().toLowerCase()

  if (filters.status && user.status !== filters.status) {
    return false
  }

  if (keyword) {
    return `${user.username} ${user.email} ${user.nickname}`.toLowerCase().includes(keyword)
  }

  return true
}

function isCurrentAdminRequest(requestToken: string | null) {
  return adminAuthStore.token === requestToken && getAdminToken() === requestToken
}

function isCurrentAdminAction(requestToken: string | null) {
  return isCurrentAdminRequest(requestToken)
}

async function fetchList() {
  const requestSequence = ++latestListRequestSequence
  const requestToken = getAdminToken()
  loading.value = true
  error.value = null
  actionError.value = ''

  try {
    const response = await getAdminUsers(buildParams())
    if (requestSequence !== latestListRequestSequence || !isCurrentAdminRequest(requestToken)) {
      return false
    }

    items.value = response.items
    Object.assign(pagination, response.meta)
    lastLoadError.value = ''
    loadRecovery.value = ''
    return true
  } catch (caughtError) {
    if (!isCurrentAdminRequest(requestToken)) {
      return false
    }

    adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
    if (requestSequence !== latestListRequestSequence) {
      return false
    }

    error.value = normalizeErrorMessage(caughtError, '获取用户列表失败')
    throw caughtError
  } finally {
    if (requestSequence === latestListRequestSequence) {
      loading.value = false
    }
  }
}

async function fetchListSafely() {
  isRetryingLoad.value = items.value.length === 0 && Boolean(error.value || lastLoadError.value)

  try {
    const applied = await fetchList()
    if (!applied) {
      return true
    }

    if (selectedUser.value && !items.value.some((user) => user.id === selectedUser.value?.id)) {
      clearSelectedUserDetail()
    }
    lastLoadError.value = ''
    loadRecovery.value = ''
    return true
  } catch (caughtError) {
    lastLoadError.value = error.value ?? '获取用户列表失败'
    loadRecovery.value = getRecoveryMessage(caughtError)

    if (items.value.length > 0) {
      actionError.value = error.value ?? '获取用户列表失败'
      actionRecovery.value = loadRecovery.value
    }

    return false
  } finally {
    isRetryingLoad.value = false
  }
}

async function loadDetail(id: number) {
  const requestSequence = ++latestDetailRequestSequence
  const requestToken = getAdminToken()
  lastDetailRequestId.value = id
  detailLoading.value = true
  detailError.value = ''
  detailRecovery.value = ''
  if (selectedUser.value?.id !== id) {
    selectedUser.value = null
  }

  try {
    const user = await getAdminUserDetail(id)
    if (
      requestSequence !== latestDetailRequestSequence ||
      lastDetailRequestId.value !== id ||
      !isCurrentAdminRequest(requestToken)
    ) {
      return
    }

    selectedUser.value = user
    detailError.value = ''
    detailRecovery.value = ''
  } catch (caughtError) {
    if (!isCurrentAdminRequest(requestToken)) {
      return
    }

    adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
    if (requestSequence !== latestDetailRequestSequence || lastDetailRequestId.value !== id) {
      return
    }

    detailError.value = normalizeErrorMessage(caughtError, '获取用户详情失败')
    detailRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    if (
      requestSequence === latestDetailRequestSequence &&
      lastDetailRequestId.value === id
    ) {
      detailLoading.value = false
    }
  }
}

async function retryDetailLoad() {
  if (lastDetailRequestId.value !== null) {
    await loadDetail(lastDetailRequestId.value)
    return
  }

  await fetchListSafely()
}

async function applyFilters() {
  const previousPage = pagination.page
  pagination.page = 1
  actionRecovery.value = ''
  const loaded = await fetchListSafely()

  if (!loaded) {
    pagination.page = previousPage
  }
}

async function changePage(page: number) {
  if (page < 1 || page > Math.max(1, pagination.totalPages) || page === pagination.page) {
    return
  }

  const previousPage = pagination.page
  pagination.page = page
  actionRecovery.value = ''
  const loaded = await fetchListSafely()

  if (!loaded) {
    pagination.page = previousPage
  }
}

function getStatusLabel(status: UserStatus) {
  return status === 'enabled' ? '启用中' : '已禁用'
}

function getToggleActionLabel(status: UserStatus) {
  return status === 'enabled' ? '禁用' : '启用'
}

async function changeStatus(user: UserProfile, nextStatus: UserStatus) {
  if (isActionLoading(user.id)) {
    return
  }

  setActionLoading(user.id, true)
  actionError.value = ''
  actionRecovery.value = ''
  const requestToken = getAdminToken()

  try {
    const updatedUser = await updateAdminUserStatus(user.id, nextStatus)
    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    const wasOnlyVisibleItem = items.value.length === 1 && items.value[0]?.id === updatedUser.id
    const movedOutOfCurrentFilters = !matchesActiveFilters(updatedUser)
    items.value = items.value
      .map((item) => (item.id === updatedUser.id ? updatedUser : item))
      .filter(matchesActiveFilters)

    if (selectedUser.value?.id === updatedUser.id) {
      selectedUser.value = updatedUser
      detailError.value = ''
      detailRecovery.value = ''
    }

    if (movedOutOfCurrentFilters) {
      const previousPage = pagination.page
      const shouldMoveBackPage = wasOnlyVisibleItem && pagination.page > 1

      if (shouldMoveBackPage) {
        pagination.page -= 1
      }

      try {
        const applied = await fetchList()
        if (applied && selectedUser.value && !items.value.some((item) => item.id === selectedUser.value?.id)) {
          clearSelectedUserDetail()
        }
      } catch (reloadError) {
        if (!isCurrentAdminAction(requestToken)) {
          return
        }

        if (shouldMoveBackPage) {
          pagination.page = previousPage
        }

        actionError.value = `用户状态已更新，但列表刷新失败：${normalizeErrorMessage(reloadError, '获取用户列表失败')}`
        actionRecovery.value = getRecoveryMessage(reloadError)
      }
    }
  } catch (caughtError) {
    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
    actionError.value = normalizeErrorMessage(caughtError, '更新用户状态失败')
    actionRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    setActionLoading(user.id, false)
  }
}

function openDeleteConfirm(user: UserProfile) {
  pendingDelete.value = {
    id: user.id,
    username: user.username,
  }
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

  const userToDelete = pendingDelete.value
  const previousPage = pagination.page
  isDeleting.value = true
  setActionLoading(userToDelete.id, true)
  actionError.value = ''
  actionRecovery.value = ''
  const requestToken = getAdminToken()

  try {
    const shouldMoveBackPage = pagination.page > 1 && items.value.length === 1 && items.value[0]?.id === userToDelete.id

    await deleteAdminUser(userToDelete.id)
    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    if (selectedUser.value?.id === userToDelete.id) {
      clearSelectedUserDetail()
    }
    if (shouldMoveBackPage) {
      pagination.page -= 1
    }

    try {
      await fetchList()
    } catch (reloadError) {
      if (!isCurrentAdminAction(requestToken)) {
        return
      }

      if (shouldMoveBackPage) {
        pagination.page = previousPage
      }

      actionError.value = `用户已删除，但列表刷新失败：${normalizeErrorMessage(reloadError, '获取用户列表失败')}`
      actionRecovery.value = getRecoveryMessage(reloadError)
    }
  } catch (caughtError) {
    if (!isCurrentAdminAction(requestToken)) {
      return
    }

    adminAuthStore.clearSessionIfConfirmedFailure(caughtError)
    actionError.value = normalizeErrorMessage(caughtError, '删除用户失败')
    actionRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    isDeleting.value = false
    if (isCurrentAdminAction(requestToken)) {
      pendingDelete.value = null
    }
    setActionLoading(userToDelete.id, false)
  }
}

const visiblePages = computed(() => {
  const totalPages = Math.max(1, pagination.totalPages)
  const currentPage = pagination.page

  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1)
  }

  const start = Math.max(1, currentPage - 2)
  const end = Math.min(totalPages, start + 4)
  const adjustedStart = Math.max(1, end - 4)

  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index)
})

onMounted(() => {
  void fetchListSafely()
})
</script>

<template>
  <section class="admin-users-view">
    <header class="surface-card admin-users-view__hero">
      <p class="admin-users-view__eyebrow">用户治理</p>
      <h1 class="admin-users-view__title">用户管理</h1>
      <p class="admin-users-view__copy">搜索用户，查看详情，调整状态</p>
    </header>

    <section class="surface-card admin-users-view__filters">
      <label class="admin-users-view__field">
        <span>关键字</span>
        <input v-model="filters.keyword" type="search" placeholder="搜索用户名或邮箱" />
      </label>

      <label class="admin-users-view__field">
        <span>状态</span>
        <select v-model="filters.status">
          <option :value="undefined">全部</option>
          <option value="enabled">启用中</option>
          <option value="disabled">已禁用</option>
        </select>
      </label>

      <button class="admin-users-view__action" type="button" @click="applyFilters">应用筛选</button>
    </section>

    <p v-if="actionError" class="admin-users-view__global-error" role="alert" aria-live="assertive">{{ actionError }}</p>
    <p v-if="actionRecovery" class="admin-users-view__global-recovery" role="status" aria-live="polite">{{ actionRecovery }}</p>

    <LoadingState v-if="loading && items.length === 0 && !lastLoadError" />

    <ErrorState
      v-else-if="(error || lastLoadError) && items.length === 0"
      :message="error || lastLoadError"
      :recovery-message="loadRecovery"
      :retrying="isRetryingLoad"
      @retry="fetchListSafely"
    />

    <EmptyState
      v-else-if="items.length === 0"
      title="当前没有匹配的用户"
      :message="`关键字：${filters.keyword || '无'}，状态：${filters.status ? getStatusLabel(filters.status) : '全部'}`"
    />

    <div v-else class="admin-users-view__layout">
      <section class="surface-card admin-users-view__panel admin-users-view__panel--desktop">
        <div class="admin-users-view__table">
          <div class="admin-users-view__table-row admin-users-view__table-row--head">
            <span>用户</span>
            <span>邮箱</span>
            <span>角色</span>
            <span>状态</span>
            <span>操作</span>
          </div>

          <div v-for="user in items" :key="user.id" class="admin-users-view__table-row">
            <span>{{ user.nickname || user.username }}</span>
            <span>{{ user.email }}</span>
            <span>{{ user.role === 'admin' ? '管理员' : '作者' }}</span>
            <span>{{ getStatusLabel(user.status) }}</span>
            <div class="admin-users-view__operations">
              <button type="button" @click="loadDetail(user.id)">查看</button>
              <button type="button" :disabled="isActionLoading(user.id)" @click="changeStatus(user, user.status === 'enabled' ? 'disabled' : 'enabled')">
                {{ getToggleActionLabel(user.status) }}
              </button>
              <button type="button" :disabled="isActionLoading(user.id)" @click="openDeleteConfirm(user)">删除</button>
            </div>
          </div>
        </div>
      </section>

      <section class="admin-users-view__cards">
        <article v-for="user in items" :key="user.id" class="surface-card admin-users-view__card">
          <p class="admin-users-view__card-status">{{ getStatusLabel(user.status) }}</p>
          <h2 class="admin-users-view__card-title">{{ user.nickname || user.username }}</h2>
          <p class="admin-users-view__card-copy">{{ user.email }}</p>
          <p class="admin-users-view__card-copy">{{ user.role === 'admin' ? '管理员' : '作者' }}</p>
          <div class="admin-users-view__operations">
            <button type="button" @click="loadDetail(user.id)">查看</button>
            <button type="button" :disabled="isActionLoading(user.id)" @click="changeStatus(user, user.status === 'enabled' ? 'disabled' : 'enabled')">
              {{ getToggleActionLabel(user.status) }}
            </button>
            <button type="button" :disabled="isActionLoading(user.id)" @click="openDeleteConfirm(user)">删除</button>
          </div>
        </article>
      </section>

      <aside class="surface-card admin-users-view__detail">
        <LoadingState
          v-if="detailLoading && !selectedUser"
          title="正在加载用户详情"
          message="同步用户资料"
        />

        <ErrorState
          v-else-if="detailError && !selectedUser"
          title="用户详情加载失败"
          :message="detailError"
          :recovery-message="detailRecovery"
          :retrying="detailLoading"
          @retry="retryDetailLoad"
        />

        <template v-else-if="selectedUser">
          <p v-if="detailError" class="admin-users-view__detail-error" role="alert" aria-live="assertive">{{ detailError }}</p>
          <p v-if="detailRecovery" class="admin-users-view__detail-recovery" role="status" aria-live="polite">{{ detailRecovery }}</p>
          <p class="admin-users-view__eyebrow">用户详情</p>
          <h2 class="admin-users-view__detail-title">{{ selectedUser.nickname || selectedUser.username }}</h2>
          <dl class="admin-users-view__detail-list">
            <div>
              <dt>用户名</dt>
              <dd>{{ selectedUser.username }}</dd>
            </div>
            <div>
              <dt>邮箱</dt>
              <dd>{{ selectedUser.email }}</dd>
            </div>
            <div>
              <dt>角色</dt>
              <dd>{{ selectedUser.role === 'admin' ? '管理员' : '作者' }}</dd>
            </div>
            <div>
              <dt>状态</dt>
              <dd>{{ getStatusLabel(selectedUser.status) }}</dd>
            </div>
            <div>
              <dt>个人简介</dt>
              <dd>{{ selectedUser.bio || '暂无简介' }}</dd>
            </div>
            <div>
              <dt>创建时间</dt>
              <dd>{{ selectedUser.createdAt }}</dd>
            </div>
          </dl>
          <p class="admin-users-view__detail-tip">禁用后该用户无法登录；文章状态按后端规则处理</p>
        </template>

        <EmptyState
          v-else
          title="请选择一个用户"
          message="查看详情后，可以继续启用、临时禁用，或尝试删除"
        />
      </aside>
    </div>

    <nav v-if="pagination.totalPages > 1" class="surface-card admin-users-view__pagination" aria-label="用户分页">
      <button
        class="admin-users-view__page-button"
        type="button"
        :disabled="pagination.page <= 1"
        @click="changePage(pagination.page - 1)"
      >
        上一页
      </button>

      <div class="admin-users-view__page-list">
        <button
          v-for="page in visiblePages"
          :key="page"
          class="admin-users-view__page-button"
          :class="{ 'is-active': page === pagination.page }"
          type="button"
          @click="changePage(page)"
        >
          {{ page }}
        </button>
      </div>

      <button
        class="admin-users-view__page-button"
        type="button"
        :disabled="pagination.page >= pagination.totalPages"
        @click="changePage(pagination.page + 1)"
      >
        下一页
      </button>
    </nav>

    <ConfirmAction
      v-if="pendingDelete"
      title="删除当前用户"
      :message="`确认删除用户「${pendingDelete.username}」 若仍有关联文章，删除会失败`"
      confirm-label="确认删除用户"
      :busy="isDeleting"
      @cancel="closeDeleteConfirm"
      @confirm="confirmDelete"
    />
  </section>
</template>

<style scoped>
.admin-users-view {
  display: grid;
  gap: 1.5rem;
}

.admin-users-view__hero,
.admin-users-view__filters,
.admin-users-view__panel,
.admin-users-view__card,
.admin-users-view__detail,
.admin-users-view__pagination {
  padding: 1.5rem;
}

.admin-users-view__eyebrow,
.admin-users-view__title,
.admin-users-view__copy,
.admin-users-view__card-status,
.admin-users-view__card-title,
.admin-users-view__card-copy,
.admin-users-view__detail-title,
.admin-users-view__global-error,
.admin-users-view__global-recovery,
.admin-users-view__detail-error,
.admin-users-view__detail-recovery,
.admin-users-view__detail-tip {
  margin: 0;
}

.admin-users-view__eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.admin-users-view__title {
  margin-top: 0.5rem;
  font-size: 1.8rem;
}

.admin-users-view__copy,
.admin-users-view__card-status,
.admin-users-view__card-copy,
.admin-users-view__detail-tip {
  margin-top: 0.85rem;
  color: var(--color-muted);
}

.admin-users-view__global-error {
  color: var(--color-danger);
}

.admin-users-view__global-recovery {
  color: var(--color-muted);
  margin-top: -0.75rem;
}

.admin-users-view__detail-error {
  color: var(--color-danger);
}

.admin-users-view__detail-recovery {
  color: var(--color-muted);
}

.admin-users-view__filters {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
  align-items: end;
}

.admin-users-view__field {
  display: grid;
  gap: 0.45rem;
}

.admin-users-view__field span {
  font-weight: 700;
}

.admin-users-view__field input,
.admin-users-view__field select {
  min-height: 2.9rem;
  padding: 0.85rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: var(--color-input-background);
  color: var(--color-text);
}

.admin-users-view__action {
  min-height: 2.9rem;
  border: 0;
  border-radius: 999px;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-weight: 700;
  cursor: pointer;
}

.admin-users-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(20rem, 0.95fr);
  gap: 1.5rem;
  align-items: start;
}

.admin-users-view__table {
  display: grid;
}

.admin-users-view__table-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1.5fr) 0.7fr 0.8fr 1.1fr;
  gap: 1rem;
  padding: 1rem 0;
  border-top: 1px solid var(--color-border);
  align-items: center;
}

.admin-users-view__table-row > span,
.admin-users-view__card-copy,
.admin-users-view__detail-list dd {
  min-width: 0;
  overflow-wrap: anywhere;
}

.admin-users-view__table-row--head {
  padding-top: 0;
  border-top: 0;
  font-weight: 700;
  color: var(--color-muted);
}

.admin-users-view__operations {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.admin-users-view__operations button {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-accent-strong);
  font-weight: 700;
  cursor: pointer;
}

.admin-users-view__operations button:disabled {
  opacity: 0.5;
  cursor: wait;
}

.admin-users-view__cards {
  display: none;
}

.admin-users-view__card {
  display: grid;
  gap: 0.75rem;
}

.admin-users-view__card-title {
  font-size: 1.25rem;
}

.admin-users-view__detail {
  display: grid;
  gap: 1rem;
}

.admin-users-view__detail-list {
  display: grid;
  gap: 0.9rem;
  margin: 0;
}

.admin-users-view__detail-list div {
  display: grid;
  gap: 0.25rem;
}

.admin-users-view__detail-list dt {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--color-muted);
}

.admin-users-view__detail-list dd {
  margin: 0;
}

.admin-users-view__pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.admin-users-view__page-list {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
}

.admin-users-view__page-button {
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

.admin-users-view__page-button.is-active {
  background: var(--color-surface-strong);
  border-color: transparent;
  color: var(--color-on-surface-strong);
}

.admin-users-view__page-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

@media (max-width: 1100px) {
  .admin-users-view__layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .admin-users-view__filters {
    grid-template-columns: 1fr;
  }

  .admin-users-view__panel--desktop {
    display: none;
  }

  .admin-users-view__cards {
    display: grid;
    gap: 1rem;
  }
}

@media (max-width: 640px) {
  .admin-users-view__pagination {
    flex-direction: column;
    align-items: stretch;
  }

  .admin-users-view__page-list {
    order: -1;
  }

  .admin-users-view__hero,
  .admin-users-view__filters,
  .admin-users-view__panel,
  .admin-users-view__card,
  .admin-users-view__detail,
  .admin-users-view__pagination {
    padding: 1rem;
  }
}
</style>
