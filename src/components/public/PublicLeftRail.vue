<script setup lang="ts">
import { Clock, House, User } from '@element-plus/icons-vue'
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'
import { parseArticleListQuery } from '@/utils/query'
import { getUserToken } from '@/utils/auth-storage'

const route = useRoute()
const isAuthenticated = ref(false)

const navItems = [
  {
    label: '首页',
    icon: House,
    to: { name: ROUTE_NAMES.home },
  },
  {
    label: '最新',
    icon: Clock,
    to: {
      name: ROUTE_NAMES.home,
      query: {
        sortField: 'publishTime',
        sortOrder: 'desc',
      },
    },
  },
]

const accountLink = computed(() =>
  isAuthenticated.value
    ? {
        label: '我的',
        to: { name: ROUTE_NAMES.profile },
      }
    : {
        label: '登录',
        to: { name: ROUTE_NAMES.login },
      },
)

function syncAuthState() {
  isAuthenticated.value = Boolean(getUserToken())
}

function isNavItemActive(label: string) {
  const filters = parseArticleListQuery(route.query)

  if (label === '最新') {
    return filters.sortField === 'publishTime' && filters.sortOrder === 'desc'
  }

  return (
    route.name === ROUTE_NAMES.home &&
    !route.hash &&
    !filters.keyword &&
    filters.categoryIds.length === 0 &&
    filters.tagIds.length === 0 &&
    !filters.sortField &&
    !filters.sortOrder
  )
}

function isAccountLinkActive() {
  return route.name === accountLink.value.to.name
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
  <aside class="public-left-rail public-rail" aria-label="公开导航" data-test="public-left-rail">
    <nav class="public-left-rail__module" aria-label="主导航">
      <p class="public-left-rail__title">导航</p>
      <RouterLink
        v-for="item in navItems"
        :key="item.label"
        v-slot="{ href, navigate }"
        custom
        :to="item.to"
      >
        <a
          class="public-left-rail__link"
          :class="{ 'is-active': isNavItemActive(item.label) }"
          :href="href"
          :aria-current="isNavItemActive(item.label) ? 'page' : undefined"
          @click="navigate"
        >
          <span class="public-left-rail__icon" aria-hidden="true">
            <component :is="item.icon" />
          </span>
          {{ item.label }}
        </a>
      </RouterLink>
    </nav>

    <nav class="public-left-rail__module" aria-label="账户">
      <p class="public-left-rail__title">账户</p>
      <RouterLink v-slot="{ href, navigate }" custom :to="accountLink.to">
        <a
          class="public-left-rail__link public-left-rail__link--strong"
          :class="{ 'is-active': isAccountLinkActive() }"
          :href="href"
          :aria-current="isAccountLinkActive() ? 'page' : undefined"
          @click="navigate"
        >
          <span class="public-left-rail__icon" aria-hidden="true">
            <User />
          </span>
          {{ accountLink.label }}
        </a>
      </RouterLink>
    </nav>
  </aside>
</template>

<style scoped>
.public-left-rail {
  position: sticky;
  top: 74px;
}

.public-left-rail__module {
  display: grid;
  gap: 0.25rem;
  padding: 0.55rem;
  border-radius: var(--public-radius-module);
}

.public-left-rail__title {
  margin: 0 0 0.25rem;
  padding-inline: 0.45rem;
  color: var(--color-muted);
  font-size: 0.82rem;
  font-weight: 700;
}

.public-left-rail__link {
  display: inline-grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: 0.5rem;
  padding: 0.55rem 0.65rem;
  border-radius: var(--public-radius-compact);
  color: var(--color-muted);
  text-decoration: none;
  font-weight: 650;
}

.public-left-rail__icon {
  display: grid;
  place-items: center;
  width: 1.45rem;
  height: 1.45rem;
  border-radius: var(--public-radius-compact);
  background: var(--public-hover-background);
  color: var(--color-accent-strong);
}

.public-left-rail__icon :deep(svg) {
  width: 0.95rem;
  height: 0.95rem;
}

.public-left-rail__link:hover,
.public-left-rail__link.is-active {
  background: var(--public-hover-background);
  color: var(--color-text);
}

.public-left-rail__link--strong {
  color: var(--color-text);
}

@media (max-width: 1080px) {
  .public-left-rail {
    position: static;
  }
}
</style>
