<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import AuthCardShell from '@/components/form/AuthCardShell.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { useUserAuthStore } from '@/stores/userAuth'
import { getUnsafeAuthInputMessage } from '@/utils/auth-input-validation'
import { normalizeErrorMessage } from '@/utils/error-message'

const router = useRouter()
const userAuthStore = useUserAuthStore()

const form = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

const fieldErrors = reactive({
  username: '',
  email: '',
  password: '',
  confirmPassword: '',
})

type RegisterField = keyof typeof fieldErrors

const shakingFields = reactive<Record<RegisterField, boolean>>({
  username: false,
  email: false,
  password: false,
  confirmPassword: false,
})

const submitError = ref('')
let shakeTimer: ReturnType<typeof setTimeout> | null = null

function getSafePostRegisterRedirect() {
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

const safeLoginRoute = computed(() => {
  const redirect = getSafePostRegisterRedirect()

  return redirect === '/writer'
    ? { name: ROUTE_NAMES.login }
    : { name: ROUTE_NAMES.login, query: { redirect } }
})

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validate() {
  fieldErrors.username = form.username.trim()
    ? getUnsafeAuthInputMessage(form.username, '用户名')
    : '请输入用户名'
  fieldErrors.email =
    getUnsafeAuthInputMessage(form.email, '邮箱') ||
    (validateEmail(form.email.trim()) ? '' : '请输入有效邮箱')
  fieldErrors.password =
    getUnsafeAuthInputMessage(form.password, '密码') ||
    (form.password.length >= 6 ? '' : '密码至少 6 位')
  fieldErrors.confirmPassword =
    getUnsafeAuthInputMessage(form.confirmPassword, '确认密码') ||
    (form.confirmPassword === form.password ? '' : '两次输入的密码不一致')

  return (
    !fieldErrors.username &&
    !fieldErrors.email &&
    !fieldErrors.password &&
    !fieldErrors.confirmPassword
  )
}

function triggerInvalidFieldShake() {
  if (shakeTimer) {
    clearTimeout(shakeTimer)
  }

  ;(Object.keys(fieldErrors) as RegisterField[]).forEach((field) => {
    shakingFields[field] = Boolean(fieldErrors[field])
  })

  shakeTimer = setTimeout(() => {
    ;(Object.keys(shakingFields) as RegisterField[]).forEach((field) => {
      shakingFields[field] = false
    })
  }, 320)
}

function clearSubmitFeedback() {
  if (userAuthStore.loading) {
    return
  }

  submitError.value = ''
}

function handleFieldInput(field: RegisterField) {
  clearSubmitFeedback()
  fieldErrors[field] = ''
  shakingFields[field] = false
}

async function handleSubmit() {
  if (userAuthStore.loading) {
    return
  }

  submitError.value = ''

  if (!validate()) {
    triggerInvalidFieldShake()
    return
  }

  try {
    const profile = await userAuthStore.register({
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      confirmPassword: form.confirmPassword,
    })
    if (!profile) {
      return
    }

    await router.push(getSafePostRegisterRedirect())
  } catch (caughtError) {
    submitError.value = normalizeErrorMessage(caughtError, '注册失败')
  }
}
</script>

<template>
  <AuthCardShell
    eyebrow="创建账号"
    title="创建作者账号"
    description="注册后自动进入作者后台"
  >
    <form class="auth-form" @submit.prevent="handleSubmit">
      <label class="auth-form__field" :class="{ 'has-error': fieldErrors.username }">
        <span>用户名</span>
        <input
          v-model="form.username"
          :aria-invalid="Boolean(fieldErrors.username)"
          :class="{ 'is-invalid': fieldErrors.username, 'is-shaking': shakingFields.username }"
          type="text"
          autocomplete="username"
          placeholder="输入唯一用户名"
          @input="handleFieldInput('username')"
        />
        <small v-if="fieldErrors.username" class="auth-form__error">{{ fieldErrors.username }}</small>
      </label>

      <label class="auth-form__field" :class="{ 'has-error': fieldErrors.email }">
        <span>邮箱</span>
        <input
          v-model="form.email"
          :aria-invalid="Boolean(fieldErrors.email)"
          :class="{ 'is-invalid': fieldErrors.email, 'is-shaking': shakingFields.email }"
          type="email"
          autocomplete="email"
          placeholder="输入邮箱"
          @input="handleFieldInput('email')"
        />
        <small v-if="fieldErrors.email" class="auth-form__error">{{ fieldErrors.email }}</small>
      </label>

      <label class="auth-form__field" :class="{ 'has-error': fieldErrors.password }">
        <span>密码</span>
        <input
          v-model="form.password"
          :aria-invalid="Boolean(fieldErrors.password)"
          :class="{ 'is-invalid': fieldErrors.password, 'is-shaking': shakingFields.password }"
          type="password"
          autocomplete="new-password"
          placeholder="至少 6 位密码"
          @input="handleFieldInput('password')"
        />
        <small v-if="fieldErrors.password" class="auth-form__error">{{ fieldErrors.password }}</small>
      </label>

      <label class="auth-form__field" :class="{ 'has-error': fieldErrors.confirmPassword }">
        <span>确认密码</span>
        <input
          v-model="form.confirmPassword"
          :aria-invalid="Boolean(fieldErrors.confirmPassword)"
          :class="{
            'is-invalid': fieldErrors.confirmPassword,
            'is-shaking': shakingFields.confirmPassword,
          }"
          type="password"
          autocomplete="new-password"
          placeholder="再次输入密码"
          @input="handleFieldInput('confirmPassword')"
        />
        <small v-if="fieldErrors.confirmPassword" class="auth-form__error">{{ fieldErrors.confirmPassword }}</small>
      </label>

      <p v-if="submitError" class="auth-form__submit-error" role="alert" aria-live="assertive">{{ submitError }}</p>

      <button class="auth-form__submit" type="submit" :disabled="userAuthStore.loading">
        {{ userAuthStore.loading ? '正在注册' : '注册' }}
      </button>

      <p class="auth-form__switch">
        已有账号？
        <RouterLink :to="safeLoginRoute">返回登录</RouterLink>
      </p>
    </form>
  </AuthCardShell>
</template>

<style scoped>
.auth-form {
  display: grid;
  gap: clamp(0.55rem, 1.25vh, 0.85rem);
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
  min-height: clamp(2.35rem, 4.8vh, 2.85rem);
  padding: 0.7rem 1rem;
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
