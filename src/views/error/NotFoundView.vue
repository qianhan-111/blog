<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const copy = computed(() => {
  if (route.path.startsWith('/admin')) {
    return '这个管理员后台地址不存在，可以返回管理员首页，或重新选择文章、分类、标签、用户管理入口'
  }

  if (route.path.startsWith('/writer')) {
    return '这个作者工作区地址不存在，可以返回作者仪表页，继续管理文章或个人资料'
  }

  return '当前公开地址不存在，你可以回到文章广场，重新浏览文章、作者主页或登录入口'
})

const actionTo = computed(() => {
  if (route.path.startsWith('/admin')) {
    return '/admin'
  }

  if (route.path.startsWith('/writer')) {
    return '/writer'
  }

  return '/'
})

const actionLabel = computed(() => {
  if (route.path.startsWith('/admin')) {
    return '返回管理员首页'
  }

  if (route.path.startsWith('/writer')) {
    return '返回作者后台'
  }

  return '返回文章广场'
})
</script>

<template>
  <section class="error-page surface-card">
    <p class="error-page__eyebrow">404</p>
    <h1 class="error-page__title">页面不存在</h1>
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
