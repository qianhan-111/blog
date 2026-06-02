<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const copy = computed(() => {
  const fromArea = String(route.query.fromArea ?? '')

  if (fromArea === 'admin' || route.path.startsWith('/admin')) {
    return '当前地址属于管理员后台，请确认管理员登录态仍然有效，或返回公开站点重新进入'
  }

  if (fromArea === 'author' || route.path.startsWith('/writer') || route.path === '/profile') {
    return '当前地址属于作者工作区，请先登录作者账号，或返回公开文章列表继续浏览'
  }

  return '你没有权限访问这个页面，请返回公开区域，或切换到正确的登录入口后重试'
})

const actionTo = computed(() => {
  const fromArea = String(route.query.fromArea ?? '')

  if (fromArea === 'admin' || route.path.startsWith('/admin')) {
    return '/admin/login'
  }

  if (fromArea === 'author' || route.path.startsWith('/writer') || route.path === '/profile') {
    return '/login'
  }

  return '/'
})

const actionLabel = computed(() => {
  const fromArea = String(route.query.fromArea ?? '')

  if (fromArea === 'admin' || route.path.startsWith('/admin')) {
    return '前往管理员登录'
  }

  if (fromArea === 'author' || route.path.startsWith('/writer') || route.path === '/profile') {
    return '前往作者登录'
  }

  return '返回首页'
})
</script>

<template>
  <section class="error-page surface-card">
    <p class="error-page__eyebrow">403</p>
    <h1 class="error-page__title">当前页面需要更高权限</h1>
    <p class="error-page__message">{{ copy }}</p>
    <RouterLink class="error-page__action" :to="actionTo">{{ actionLabel }}</RouterLink>
  </section>
</template>

<style scoped>
.error-page {
  display: grid;
  gap: 1rem;
  max-width: 42rem;
  padding: 2rem;
}

.error-page__eyebrow,
.error-page__title,
.error-page__message {
  margin: 0;
}

.error-page__eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.error-page__title {
  font-size: clamp(2rem, 4vw, 2.8rem);
}

.error-page__message {
  color: var(--color-muted);
  line-height: 1.7;
}

.error-page__action {
  width: fit-content;
  min-height: 2.9rem;
  padding: 0.8rem 1rem;
  border-radius: 999px;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  text-decoration: none;
  font-weight: 700;
}
</style>
