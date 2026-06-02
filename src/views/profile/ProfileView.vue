<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'

import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import { updateCurrentUserProfile } from '@/api/profile'
import { useUserAuthStore } from '@/stores/userAuth'
import { getUserToken } from '@/utils/auth-storage'
import { normalizeErrorMessage } from '@/utils/error-message'

const userAuthStore = useUserAuthStore()

const form = reactive({
  nickname: '',
  avatarUrl: '',
  bio: '',
})

const feedback = ref('')
const submitError = ref('')
const lastLoadError = ref('')
const isRetryingLoad = ref(false)
const saving = ref(false)

function syncForm() {
  form.nickname = userAuthStore.profile?.nickname ?? ''
  form.avatarUrl = userAuthStore.profile?.avatarUrl ?? ''
  form.bio = userAuthStore.profile?.bio ?? ''
}

const displayName = computed(() => userAuthStore.profile?.nickname || userAuthStore.profile?.username || '')

function clearFormFeedback() {
  if (saving.value) {
    return
  }

  feedback.value = ''
  submitError.value = ''
}

function isCurrentSaveSession(requestToken: string | null) {
  return userAuthStore.token === requestToken && getUserToken() === requestToken
}

async function handleSubmit() {
  if (!userAuthStore.profile || saving.value) {
    return
  }

  const requestToken = userAuthStore.token
  feedback.value = ''
  submitError.value = ''
  saving.value = true

  try {
    const nextProfile = await updateCurrentUserProfile({
      nickname: form.nickname.trim(),
      avatarUrl: form.avatarUrl.trim(),
      bio: form.bio.trim(),
    })

    if (!isCurrentSaveSession(requestToken)) {
      return
    }

    userAuthStore.profile = nextProfile
    syncForm()
    feedback.value = '个人资料已保存'
  } catch (caughtError) {
    if (!isCurrentSaveSession(requestToken)) {
      return
    }

    userAuthStore.clearSessionIfConfirmedFailure(caughtError)
    submitError.value = normalizeErrorMessage(caughtError, '保存失败')
  } finally {
    saving.value = false
  }
}

async function retryFetch() {
  isRetryingLoad.value = true

  try {
    await userAuthStore.hydrate()
    syncForm()

    if (userAuthStore.profile) {
      lastLoadError.value = ''
    } else if (userAuthStore.error) {
      lastLoadError.value = userAuthStore.error
    }
  } finally {
    isRetryingLoad.value = false
  }
}

onMounted(async () => {
  if (!userAuthStore.profile) {
    await userAuthStore.hydrate()
    lastLoadError.value = userAuthStore.error ?? ''
  }

  syncForm()
})
</script>

<template>
  <section class="profile-view">
    <LoadingState
      v-if="userAuthStore.loading && !userAuthStore.profile && !lastLoadError"
      title="正在加载个人资料"
      message="同步账户信息"
    />

    <ErrorState
      v-else-if="(submitError || userAuthStore.error || lastLoadError) && !userAuthStore.profile"
      title="个人资料暂时不可用"
      :message="submitError || userAuthStore.error || lastLoadError"
      :retrying="isRetryingLoad"
      @retry="retryFetch"
    />

    <template v-else-if="userAuthStore.profile">
      <header class="profile-view__hero surface-card">
        <img
          v-if="userAuthStore.profile.avatarUrl"
          class="profile-view__avatar"
          :src="userAuthStore.profile.avatarUrl"
          :alt="displayName"
        />
        <div v-else class="profile-view__avatar profile-view__avatar--fallback" aria-hidden="true">
          {{ displayName.slice(0, 1).toUpperCase() }}
        </div>

        <div class="profile-view__copy">
          <p class="profile-view__eyebrow">个人中心</p>
          <h1 class="profile-view__title">{{ displayName }}</h1>
          <p class="profile-view__meta">
            当前账号：{{ userAuthStore.profile.username }} · {{ userAuthStore.profile.email }}
          </p>
        </div>
      </header>

      <form class="profile-view__form surface-card" @submit.prevent="handleSubmit">
        <div class="profile-view__intro">
          <div>
            <p class="profile-view__eyebrow">基础资料</p>
            <h2 class="profile-view__section-title">公开信息</h2>
          </div>
          <RouterLink class="profile-view__dashboard-link" to="/writer">前往作者后台</RouterLink>
        </div>

        <label class="profile-view__field">
          <span>昵称</span>
          <input v-model="form.nickname" type="text" placeholder="输入展示昵称" @input="clearFormFeedback" />
        </label>

        <label class="profile-view__field">
          <span>头像链接</span>
          <input v-model="form.avatarUrl" type="url" placeholder="粘贴头像链接" @input="clearFormFeedback" />
        </label>

        <label class="profile-view__field">
          <span>个人简介</span>
          <textarea v-model="form.bio" rows="5" placeholder="简单介绍你的写作方向与关注主题" @input="clearFormFeedback" />
        </label>

        <p v-if="feedback" class="profile-view__feedback profile-view__feedback--success">{{ feedback }}</p>
        <p v-if="submitError" class="profile-view__feedback profile-view__feedback--error">{{ submitError }}</p>

        <div class="profile-view__actions">
          <button class="profile-view__submit" type="submit" :disabled="saving">
            {{ saving ? '正在保存' : '保存个人资料' }}
          </button>
        </div>
      </form>
    </template>
  </section>
</template>

<style scoped>
.profile-view {
  display: grid;
  gap: 1.5rem;
}

.profile-view__hero {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 1.25rem;
  align-items: center;
  padding: clamp(1.25rem, 2vw, 1.75rem);
}

.profile-view__avatar {
  width: 5.5rem;
  height: 5.5rem;
  border-radius: 1.5rem;
  object-fit: cover;
}

.profile-view__avatar--fallback {
  display: grid;
  place-items: center;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-size: 1.85rem;
  font-weight: 700;
}

.profile-view__copy,
.profile-view__form {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.profile-view__eyebrow,
.profile-view__title,
.profile-view__meta,
.profile-view__section-title,
.profile-view__feedback {
  margin: 0;
}

.profile-view__eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.profile-view__title {
  margin-top: 0.45rem;
  font-size: clamp(2rem, 4vw, 2.8rem);
}

.profile-view__meta {
  color: var(--color-muted);
  overflow-wrap: anywhere;
}

.profile-view__title {
  overflow-wrap: anywhere;
}

.profile-view__form {
  padding: clamp(1.25rem, 2vw, 1.75rem);
}

.profile-view__intro {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 1rem;
  align-items: end;
}

.profile-view__section-title {
  margin-top: 0.45rem;
  font-size: 1.45rem;
}

.profile-view__dashboard-link {
  width: fit-content;
  padding: 0.8rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--color-border);
  color: var(--color-text);
  text-decoration: none;
  font-weight: 700;
}

.profile-view__field {
  display: grid;
  gap: 0.45rem;
}

.profile-view__field span {
  font-weight: 700;
}

.profile-view__field input,
.profile-view__field textarea {
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: var(--color-input-background);
  color: var(--color-text);
}

.profile-view__field textarea {
  resize: vertical;
}

.profile-view__feedback--success {
  color: var(--color-success);
}

.profile-view__feedback--error {
  color: var(--color-danger);
}

.profile-view__actions {
  display: flex;
  justify-content: flex-end;
}

.profile-view__submit {
  min-height: 3rem;
  padding: 0.85rem 1.2rem;
  border: 0;
  border-radius: 999px;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-weight: 700;
  cursor: pointer;
}

.profile-view__submit:disabled {
  opacity: 0.6;
  cursor: wait;
}

@media (max-width: 720px) {
  .profile-view__hero {
    grid-template-columns: 1fr;
    justify-items: start;
  }

  .profile-view__actions {
    justify-content: stretch;
  }

  .profile-view__submit {
    width: 100%;
  }
}
</style>
