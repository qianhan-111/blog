<script setup lang="ts">
import { Search } from '@element-plus/icons-vue'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'

import ThemeToggle from '@/components/common/ThemeToggle.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { buildArticleListQuery, parseArticleListQuery } from '@/utils/query'
import { getUserToken } from '@/utils/auth-storage'

const props = defineProps<{
  brandName?: string
}>()

interface HeaderNavItem {
  label: string
  to: RouteLocationRaw
}

const route = useRoute()
const router = useRouter()
const isMobileMenuOpen = ref(false)
const isAuthenticated = ref(false)
const searchKeyword = ref('')
const isSearchFocused = ref(false)

const DEFAULT_ARTICLE_FILTERS = {
  page: 1,
  pageSize: 20,
  keyword: '',
  categoryIds: [],
  tagIds: [],
  sortField: undefined,
  sortOrder: undefined,
} as const

const brandName = computed(() => props.brandName || '博客平台')

const primaryNavItems: HeaderNavItem[] = [
  {
    label: '首页',
    to: { name: ROUTE_NAMES.home },
  },
  {
    label: '最新',
    to: {
      name: ROUTE_NAMES.home,
      query: {
        sortField: 'publishTime',
        sortOrder: 'desc',
      },
    },
  },
  {
    label: '分类',
    to: {
      name: ROUTE_NAMES.home,
      hash: '#categories',
    },
  },
  {
    label: '标签',
    to: {
      name: ROUTE_NAMES.home,
      hash: '#tags',
    },
  },
]

function closeMobileMenu() {
  isMobileMenuOpen.value = false
}

function isPrimaryNavActive(label: string) {
  const filters = parseArticleListQuery(route.query)

  if (label === '最新') {
    return filters.sortField === 'publishTime' && filters.sortOrder === 'desc'
  }

  if (label === '分类') {
    return route.hash === '#categories' || filters.categoryIds.length > 0
  }

  if (label === '标签') {
    return route.hash === '#tags' || filters.tagIds.length > 0
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

function isActive(path: string) {
  return route.path === path
}

function syncAuthState() {
  isAuthenticated.value = Boolean(getUserToken())
}

function isBaseArticleQuery(filters: ReturnType<typeof parseArticleListQuery>) {
  return (
    filters.page === DEFAULT_ARTICLE_FILTERS.page &&
    filters.pageSize === DEFAULT_ARTICLE_FILTERS.pageSize &&
    filters.keyword.trim() === DEFAULT_ARTICLE_FILTERS.keyword &&
    filters.categoryIds.length === 0 &&
    filters.tagIds.length === 0 &&
    filters.sortField === DEFAULT_ARTICLE_FILTERS.sortField &&
    filters.sortOrder === DEFAULT_ARTICLE_FILTERS.sortOrder
  )
}

async function submitSearch() {
  const keyword = searchKeyword.value.trim()
  const currentFilters = parseArticleListQuery(route.query)
  const nextFilters = {
    ...currentFilters,
    page: 1,
    keyword,
  }
  const nextQuery = buildArticleListQuery(
    nextFilters,
    currentFilters,
  )
  closeMobileMenu()

  await router.push({
    name: ROUTE_NAMES.home,
    query: isBaseArticleQuery(nextFilters) ? undefined : nextQuery,
  })
}

function handleDesktopBreakpointChange(event: MediaQueryListEvent) {
  if (event.matches) {
    closeMobileMenu()
  }
}

let desktopMediaQuery: MediaQueryList | null = null

onMounted(() => {
  syncAuthState()
  searchKeyword.value = typeof route.query.keyword === 'string' ? route.query.keyword : ''

  desktopMediaQuery = window.matchMedia('(min-width: 961px)')

  if (desktopMediaQuery.matches) {
    closeMobileMenu()
  }

  desktopMediaQuery.addEventListener('change', handleDesktopBreakpointChange)
})

onBeforeUnmount(() => {
  desktopMediaQuery?.removeEventListener('change', handleDesktopBreakpointChange)
})

watch(
  () => route.fullPath,
  () => {
    syncAuthState()
    searchKeyword.value = typeof route.query.keyword === 'string' ? route.query.keyword : ''
  },
)
</script>

<template>
  <header class="site-header" data-test="site-header">
    <div class="site-header__inner">
      <RouterLink class="site-header__brand" to="/" @click="closeMobileMenu">
        <span class="site-header__logo">
          <slot name="logo">博</slot>
        </span>
        <span class="site-header__brand-name">{{ brandName }}</span>
      </RouterLink>

      <nav class="site-header__primary-nav" data-test="header-primary-nav" aria-label="公共导航">
        <RouterLink
          v-for="item in primaryNavItems"
          :key="item.label"
          v-slot="{ href, navigate }"
          custom
          :to="item.to"
        >
          <a
            :href="href"
            :class="{ 'is-active': isPrimaryNavActive(item.label) }"
            :aria-current="isPrimaryNavActive(item.label) ? 'page' : undefined"
            @click="navigate"
          >
            {{ item.label }}
          </a>
        </RouterLink>
      </nav>

      <div class="site-header__tools">
        <form
          class="site-header__search"
          :class="{ 'is-focused': isSearchFocused }"
          data-test="site-header-search"
          role="search"
          @submit.prevent="submitSearch"
        >
          <label class="site-header__search-label" for="site-header-search">搜索文章</label>
          <button class="site-header__search-button" type="submit" aria-label="搜索">
            <Search aria-hidden="true" />
          </button>
          <input
            id="site-header-search"
            v-model="searchKeyword"
            class="site-header__search-input"
            type="search"
            placeholder="搜索文章"
            @focus="isSearchFocused = true"
            @blur="isSearchFocused = false"
          />
        </form>

        <ThemeToggle />

        <nav class="site-header__user-nav" data-test="header-user-nav" aria-label="账户导航">
          <RouterLink
            v-if="isAuthenticated"
            :class="{ 'is-active': isActive('/profile') }"
            to="/profile"
          >
            我的
          </RouterLink>
          <template v-else>
            <RouterLink :class="{ 'is-active': isActive('/login') }" to="/login">登录</RouterLink>
            <RouterLink :class="{ 'is-active': isActive('/register') }" to="/register">注册</RouterLink>
          </template>
        </nav>

        <button
          class="site-header__menu-trigger"
          type="button"
          :aria-expanded="isMobileMenuOpen"
          aria-controls="site-header-mobile-menu"
          aria-label="切换导航"
          @click="isMobileMenuOpen = !isMobileMenuOpen"
        >
          {{ isMobileMenuOpen ? '关闭' : '菜单' }}
        </button>
      </div>
    </div>

    <div
      v-if="isMobileMenuOpen"
      id="site-header-mobile-menu"
      class="site-header__mobile-menu"
    >
      <form class="site-header__mobile-search" role="search" @submit.prevent="submitSearch">
        <label class="site-header__search-label" for="site-header-search-mobile">搜索文章</label>
        <button class="site-header__search-button" type="submit" aria-label="搜索">
          <Search aria-hidden="true" />
        </button>
        <input
          id="site-header-search-mobile"
          v-model="searchKeyword"
          class="site-header__search-input"
          type="search"
          placeholder="搜索文章"
        />
      </form>

      <nav class="site-header__mobile-nav" aria-label="移动端公共导航">
        <RouterLink
          v-for="item in primaryNavItems"
          :key="item.label"
          :to="item.to"
          @click="closeMobileMenu"
        >
          {{ item.label }}
        </RouterLink>
        <RouterLink v-if="isAuthenticated" to="/profile" @click="closeMobileMenu">我的</RouterLink>
        <template v-else>
          <RouterLink to="/login" @click="closeMobileMenu">登录</RouterLink>
          <RouterLink to="/register" @click="closeMobileMenu">注册</RouterLink>
        </template>
      </nav>
    </div>
  </header>
</template>

<style scoped>
.site-header {
  position: fixed;
  inset: 0 0 auto;
  z-index: 30;
  min-height: 58px;
  border-bottom: 1px solid var(--public-feed-divider);
  background: var(--public-topbar-background);
  color: var(--color-text);
  backdrop-filter: blur(14px);
}

.site-header__inner {
  position: relative;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 1rem;
  align-items: center;
  width: min(100% - 2rem, 1280px);
  min-height: 58px;
  margin: 0 auto;
}

.site-header__brand {
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  min-width: 0;
  color: inherit;
  text-decoration: none;
}

.site-header__logo {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-compact);
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-weight: 700;
  line-height: 1;
}

.site-header__brand-name {
  max-width: 12rem;
  overflow: hidden;
  font-size: 0.98rem;
  font-weight: 700;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-header__primary-nav,
.site-header__user-nav,
.site-header__mobile-nav {
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
}

.site-header__primary-nav a,
.site-header__user-nav a,
.site-header__mobile-nav a {
  padding: 0.45rem 0.6rem;
  border-radius: var(--public-radius-compact);
  color: var(--color-muted);
  text-decoration: none;
  font-size: 0.94rem;
  font-weight: 600;
  transition:
    color 160ms ease,
    background-color 160ms ease;
}

.site-header__primary-nav a:hover,
.site-header__primary-nav a.is-active,
.site-header__user-nav a:hover,
.site-header__user-nav a.is-active,
.site-header__mobile-nav a:hover {
  background: var(--public-hover-background);
  color: var(--color-text);
}

.site-header__tools {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.site-header__search,
.site-header__mobile-search {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  overflow: hidden;
  width: clamp(10rem, 16vw, 15rem);
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-compact);
  background: var(--color-input-background);
  transition:
    width 180ms ease,
    background-color 160ms ease,
    box-shadow 160ms ease;
}

.site-header__search-label {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.site-header__search-input {
  width: 100%;
  min-height: 2.1rem;
  padding: 0.4rem 0.7rem 0.4rem 0.2rem;
  border: 0;
  background: transparent;
  color: var(--color-text);
}

.site-header__search.is-focused {
  width: clamp(20rem, 31vw, 31rem);
  background: var(--public-topbar-background);
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.12);
}

.site-header__search:focus-within,
.site-header__mobile-search:focus-within {
  border-color: color-mix(in srgb, var(--color-accent) 48%, var(--public-feed-divider));
  box-shadow: 0 0 0 3px var(--color-focus-ring);
}

.site-header__search-input:focus-visible,
.site-header__search-button:focus-visible {
  box-shadow: none;
}

.site-header__search-button {
  display: grid;
  place-items: center;
  width: 2.1rem;
  min-height: 2.1rem;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-muted);
  cursor: pointer;
}

.site-header__search-button :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.site-header__search-input::placeholder {
  color: var(--color-muted);
}

.site-header__menu-trigger {
  display: none;
  min-height: 2.1rem;
  padding: 0.4rem 0.7rem;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-compact);
  background: transparent;
  color: var(--color-text);
  font-weight: 600;
  cursor: pointer;
}

.site-header__mobile-menu {
  display: none;
}

@media (max-width: 1040px) {
  .site-header__inner {
    grid-template-columns: auto 1fr auto;
  }

  .site-header__search {
    display: none;
  }
}

@media (max-width: 860px) {
  .site-header__primary-nav,
  .site-header__user-nav {
    display: none;
  }

  .site-header__menu-trigger {
    display: inline-flex;
    align-items: center;
  }

  .site-header__mobile-menu {
    display: grid;
    gap: 0.75rem;
    padding: 0.75rem 1rem 1rem;
    border-bottom: 1px solid var(--public-feed-divider);
    background: var(--public-topbar-background);
  }

  .site-header__mobile-search {
    display: grid;
    width: 100%;
  }

  .site-header__mobile-search .site-header__search-input {
    width: 100%;
  }

  .site-header__mobile-nav {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .site-header__mobile-nav a {
    text-align: center;
  }
}

@media (max-width: 520px) {
  .site-header__inner {
    width: min(100% - 1rem, 1280px);
  }

  .site-header__brand-name {
    max-width: 9rem;
  }

  .site-header__tools {
    gap: 0.35rem;
  }
}
</style>
