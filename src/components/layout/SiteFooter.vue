<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { getUserToken } from '@/utils/auth-storage'

const props = defineProps<{
  siteName?: string
}>()

const route = useRoute()
const siteName = computed(() => props.siteName || '博客平台')
const currentYear = new Date().getFullYear()
const isAuthenticated = ref(false)

function syncAuthState() {
  isAuthenticated.value = Boolean(getUserToken())
}

syncAuthState()

watch(
  () => route.fullPath,
  () => {
    syncAuthState()
  },
)
</script>

<template>
  <footer class="site-footer">
    <p class="site-footer__name">{{ siteName }}</p>
    <p class="site-footer__copy">© {{ currentYear }} {{ siteName }}</p>

    <nav class="site-footer__links" aria-label="页脚链接">
      <RouterLink to="/">首页</RouterLink>
      <RouterLink v-if="isAuthenticated" to="/profile">我的</RouterLink>
      <template v-else>
        <RouterLink to="/login">登录</RouterLink>
        <RouterLink to="/register">注册</RouterLink>
      </template>
    </nav>
  </footer>
</template>

<style scoped>
.site-footer {
  display: grid;
  gap: 0.45rem;
  color: var(--color-muted);
  font-size: 0.86rem;
}

.site-footer__name,
.site-footer__copy {
  margin: 0;
}

.site-footer__name {
  color: var(--color-text);
  font-weight: 700;
}

.site-footer__links {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.site-footer__links a {
  color: var(--color-muted);
  text-decoration: none;
}

.site-footer__links a:hover {
  color: var(--color-accent-strong);
}
</style>
