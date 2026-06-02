<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthCardShell from '@/components/form/AuthCardShell.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { useUserAuthStore } from '@/stores/userAuth'
import { getUnsafeAuthInputMessage } from '@/utils/auth-input-validation'
import { getAuthRecoveryMessage, normalizeErrorMessage } from '@/utils/error-message'

const router = useRouter()
const userAuthStore = useUserAuthStore()

const form = reactive({
  account: '',
  password: '',
})

const fieldErrors = reactive({
  account: '',
  password: '',
})

type LoginField = keyof typeof fieldErrors

const shakingFields = reactive<Record<LoginField, boolean>>({
  account: false,
  password: false,
})

const submitError = ref('')
const submitRecovery = ref('')
let shakeTimer: ReturnType<typeof setTimeout> | null = null

function getSafePostLoginRedirect() {
  const redirect = router.currentRoute.value.query.redirect
  const value = Array.isArray(redirect) ? redirect[0] : redirect

  if (
    typeof value === 'string' &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    (value === '/profile' ||
      value.startsWith('/profile?') ||
      value === '/writer' ||
      value.startsWith('/writer/') ||
      value.startsWith('/writer?'))
  ) {
    return value
  }

  return '/writer'
}

const safeRegisterRoute = computed(() => {
  const redirect = getSafePostLoginRedirect()

  return redirect === '/writer'
    ? { name: ROUTE_NAMES.register }
    : { name: ROUTE_NAMES.register, query: { redirect } }
})

function validate() {
  fieldErrors.account = form.account.trim()
    ? getUnsafeAuthInputMessage(form.account, '用户名或邮箱')
    : '请输入用户名或邮箱'
  fieldErrors.password = form.password ? getUnsafeAuthInputMessage(form.password, '密码') : '请输入密码'

  return !fieldErrors.account && !fieldErrors.password
}

function triggerInvalidFieldShake() {
  if (shakeTimer) {
    clearTimeout(shakeTimer)
  }

  ;(Object.keys(fieldErrors) as LoginField[]).forEach((field) => {
    shakingFields[field] = Boolean(fieldErrors[field])
  })

  shakeTimer = setTimeout(() => {
    ;(Object.keys(shakingFields) as LoginField[]).forEach((field) => {
      shakingFields[field] = false
    })
  }, 320)
}

function clearSubmitFeedback() {
  if (userAuthStore.loading) {
    return
  }

  submitError.value = ''
  submitRecovery.value = ''
}

function handleFieldInput(field: LoginField) {
  clearSubmitFeedback()
  fieldErrors[field] = ''
  shakingFields[field] = false
}

async function handleSubmit() {
  if (userAuthStore.loading) {
    return
  }

  submitError.value = ''
  submitRecovery.value = ''

  if (!validate()) {
    triggerInvalidFieldShake()
    return
  }

  try {
    const profile = await userAuthStore.login({
      account: form.account.trim(),
      password: form.password,
    })
    if (!profile) {
      return
    }

    await router.push(getSafePostLoginRedirect())
  } catch (caughtError) {
    submitError.value = normalizeErrorMessage(caughtError, '登录失败')
    submitRecovery.value = getAuthRecoveryMessage(caughtError)
  }
}
</script>

<template>
  <AuthCardShell
    eyebrow="用户登录"
    title="进入写作后台"
    description="支持用户名或邮箱登录"
  >
    <form class="auth-form" @submit.prevent="handleSubmit">
      <label class="auth-form__field" :class="{ 'has-error': fieldErrors.account }">
        <span>用户名或邮箱</span>
        <input
          v-model="form.account"
          :aria-invalid="Boolean(fieldErrors.account)"
          :class="{ 'is-invalid': fieldErrors.account, 'is-shaking': shakingFields.account }"
          type="text"
          autocomplete="username"
          placeholder="用户名或邮箱"
          @input="handleFieldInput('account')"
        />
        <small v-if="fieldErrors.account" class="auth-form__error">{{ fieldErrors.account }}</small>
      </label>

      <label class="auth-form__field" :class="{ 'has-error': fieldErrors.password }">
        <span>密码</span>
        <input
          v-model="form.password"
          :aria-invalid="Boolean(fieldErrors.password)"
          :class="{ 'is-invalid': fieldErrors.password, 'is-shaking': shakingFields.password }"
          type="password"
          autocomplete="current-password"
          placeholder="输入你的密码"
          @input="handleFieldInput('password')"
        />
        <small v-if="fieldErrors.password" class="auth-form__error">{{ fieldErrors.password }}</small>
      </label>

      <p v-if="submitError" class="auth-form__submit-error" role="alert" aria-live="assertive">{{ submitError }}</p>
      <p v-if="submitRecovery" class="auth-form__submit-recovery" role="status" aria-live="polite">{{ submitRecovery }}</p>

      <button class="auth-form__submit" type="submit" :disabled="userAuthStore.loading">
        {{ userAuthStore.loading ? '正在登录' : '登录' }}
      </button>

      <p class="auth-form__switch">
        还没有账号？
        <RouterLink :to="safeRegisterRoute">立即注册</RouterLink>
      </p>
    </form>
  </AuthCardShell>
</template>

<style scoped>
.auth-form {
  display: grid;
  gap: clamp(0.65rem, 1.5vh, 0.95rem);
}

.auth-form__field {
  display: grid;
  gap: 0.45rem;
}

.auth-form__field span {
  font-weight: 700;
  color: var(--color-text);
}

.auth-form__field input {
  min-height: clamp(2.45rem, 5.2vh, 3rem);
  padding: 0.75rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: var(--color-input-background);
  color: var(--color-text);
}

.auth-form__error,
.auth-form__submit-error {
  margin: 0;
  color: var(--color-danger);
}

.auth-form__submit-recovery {
  margin: -0.35rem 0 0;
  color: var(--color-muted);
  font-size: 0.92rem;
}

.auth-form__submit {
  min-height: 3rem;
  border: 0;
  border-radius: 999px;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-weight: 700;
  cursor: pointer;
}

.auth-form__submit:disabled {
  opacity: 0.6;
  cursor: wait;
}

.auth-form__switch {
  margin: 0;
  color: var(--color-muted);
}

.auth-form__switch a {
  color: var(--color-accent-strong);
  font-weight: 700;
  text-decoration: none;
}
</style>
