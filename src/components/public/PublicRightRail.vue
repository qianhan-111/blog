<script setup lang="ts">
import { Clock, Collection, Filter, PriceTag, Search } from '@element-plus/icons-vue'
import { computed, onMounted } from 'vue'
import { RouterLink } from 'vue-router'

import ArticleFilterPanel from '@/components/public/ArticleFilterPanel.vue'
import PublicRailFooter from '@/components/public/PublicRailFooter.vue'
import PublicSearchBox from '@/components/public/PublicSearchBox.vue'
import { ROUTE_NAMES } from '@/constants/routes'
import { useRecentPublicArticlesStore } from '@/stores/recentPublicArticles'
import type { PublicArticleListFilterState } from '@/types/article'
import type { Category } from '@/types/category'
import type { Tag } from '@/types/tag'

const props = withDefaults(
  defineProps<{
    categories?: Category[]
    tags?: Tag[]
    filters: PublicArticleListFilterState
    taxonomyLoading?: boolean
    taxonomyError?: string | null
    siteName?: string
  }>(),
  {
    categories: () => [],
    tags: () => [],
    taxonomyLoading: false,
    taxonomyError: null,
    siteName: '博客平台',
  },
)

const emit = defineEmits<{
  search: [keyword: string]
  'update:filters': [filters: PublicArticleListFilterState]
  apply: []
  clear: []
}>()

const recentPublicArticlesStore = useRecentPublicArticlesStore()

const keyword = computed({
  get: () => props.filters.keyword,
  set: () => undefined,
})

const visibleCategories = computed(() => props.categories.slice(0, 4))
const visibleTags = computed(() => props.tags.slice(0, 5))
const recentArticles = computed(() => recentPublicArticlesStore.items.slice(0, 5))

function isTagActive(tagId: number) {
  return props.filters.tagIds.includes(tagId)
}

function isCategoryActive(categoryId: number) {
  return props.filters.categoryIds.includes(categoryId)
}

const filterSummary = computed(() => {
  const summary: string[] = []

  if (props.filters.keyword.trim()) {
    summary.push(`"${props.filters.keyword.trim()}"`)
  }

  if (props.filters.categoryIds.length > 0) {
    summary.push(`${props.filters.categoryIds.length} 分类`)
  }

  if (props.filters.tagIds.length > 0) {
    summary.push(`${props.filters.tagIds.length} 标签`)
  }

  if (props.filters.sortField || props.filters.sortOrder) {
    summary.push('排序')
  }

  return summary.length > 0 ? summary.join(' / ') : '默认浏览'
})

onMounted(() => {
  recentPublicArticlesStore.initRecentPublicArticles()
})
</script>

<template>
  <aside
    class="public-right-rail public-rail"
    aria-label="辅助信息"
    data-test="public-right-rail"
  >
    <section class="public-side-module public-right-rail__module">
      <h2 class="public-right-rail__title">
        <span aria-hidden="true">
          <Search />
        </span>
        搜索
      </h2>
      <PublicSearchBox
        :model-value="keyword"
        placeholder="关键词"
        @submit="emit('search', $event)"
      />
    </section>

    <section class="public-side-module public-right-rail__module">
      <h2 class="public-right-rail__title">
        <span aria-hidden="true">
          <Filter />
        </span>
        当前状态
      </h2>
      <p class="public-right-rail__summary">{{ filterSummary }}</p>
    </section>

    <section id="tags" class="public-side-module public-right-rail__module">
      <h2 class="public-right-rail__title">
        <span aria-hidden="true">
          <PriceTag />
        </span>
        标签
      </h2>
      <div class="public-right-rail__chips">
        <RouterLink
          v-for="tag in visibleTags"
          :key="tag.id"
          v-slot="{ href, navigate }"
          custom
          :to="{ name: ROUTE_NAMES.home, query: { tagIds: String(tag.id), page: '1' } }"
        >
          <a
            :href="href"
            :class="{ 'is-active': isTagActive(tag.id) }"
            :aria-current="isTagActive(tag.id) ? 'page' : undefined"
            @click="navigate"
          >
            {{ tag.name }}
          </a>
        </RouterLink>
        <span v-if="visibleTags.length === 0" class="public-right-rail__empty">暂无快捷标签</span>
      </div>
    </section>

    <section id="categories" class="public-side-module public-right-rail__module">
      <h2 class="public-right-rail__title">
        <span aria-hidden="true">
          <Collection />
        </span>
        分类
      </h2>
      <div class="public-right-rail__links">
        <RouterLink
          v-for="category in visibleCategories"
          :key="category.id"
          v-slot="{ href, navigate }"
          custom
          :to="{ name: ROUTE_NAMES.home, query: { categoryIds: String(category.id), page: '1' } }"
        >
          <a
            :href="href"
            :class="{ 'is-active': isCategoryActive(category.id) }"
            :aria-current="isCategoryActive(category.id) ? 'page' : undefined"
            @click="navigate"
          >
            {{ category.name }}
          </a>
        </RouterLink>
        <span v-if="visibleCategories.length === 0" class="public-right-rail__empty">暂无快捷分类</span>
      </div>
    </section>

    <ArticleFilterPanel
      :filters="filters"
      :categories="categories"
      :tags="tags"
      :taxonomy-loading="taxonomyLoading"
      :taxonomy-error="taxonomyError"
      @update:filters="emit('update:filters', $event)"
      @apply="emit('apply')"
      @clear="emit('clear')"
    />

    <section class="public-side-module public-right-rail__module">
      <h2 class="public-right-rail__title">
        <span aria-hidden="true">
          <Clock />
        </span>
        最近浏览
      </h2>
      <div v-if="recentArticles.length > 0" class="public-right-rail__recent-list">
        <RouterLink
          v-for="article in recentArticles"
          :key="article.id"
          class="public-right-rail__recent-link"
          :to="{ name: ROUTE_NAMES.articleDetail, params: { id: article.id } }"
        >
          <strong>{{ article.title }}</strong>
          <span>{{ article.authorName }}</span>
        </RouterLink>
      </div>
      <p v-else class="public-right-rail__empty">还没有浏览记录</p>
    </section>

    <PublicRailFooter :site-name="siteName" />
  </aside>
</template>

<style scoped>
.public-right-rail {
  position: sticky;
  top: 74px;
}

.public-right-rail__module {
  display: grid;
  gap: 0.7rem;
}

.public-right-rail__title,
.public-right-rail__summary {
  margin: 0;
}

.public-right-rail__title {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.94rem;
}

.public-right-rail__title span {
  display: grid;
  place-items: center;
  width: 1.55rem;
  height: 1.55rem;
  border-radius: var(--public-radius-compact);
  background: var(--public-hover-background);
  color: var(--color-accent-strong);
}

.public-right-rail__title span :deep(svg) {
  width: 0.95rem;
  height: 0.95rem;
}

.public-right-rail__chips,
.public-right-rail__links {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.public-right-rail__chips a,
.public-right-rail__links a,
.public-right-rail__recent-link {
  min-width: 0;
  padding: 0.32rem 0.5rem;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-compact);
  color: var(--color-muted);
  text-decoration: none;
  font-size: 0.86rem;
  overflow-wrap: anywhere;
}

.public-right-rail__chips a:hover,
.public-right-rail__chips a.is-active,
.public-right-rail__links a:hover,
.public-right-rail__links a.is-active,
.public-right-rail__recent-link:hover {
  background: var(--public-hover-background);
  color: var(--color-text);
}

.public-right-rail__recent-list {
  display: grid;
  gap: 0.45rem;
}

.public-right-rail__recent-link {
  display: grid;
  gap: 0.18rem;
}

.public-right-rail__recent-link strong,
.public-right-rail__recent-link span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.public-right-rail__recent-link strong {
  color: var(--color-text);
  font-size: 0.9rem;
}

.public-right-rail__summary,
.public-right-rail__empty {
  color: var(--color-muted);
  font-size: 0.9rem;
}

:root[data-theme='dark'] .public-right-rail__chips a,
:root[data-theme='dark'] .public-right-rail__links a,
:root[data-theme='dark'] .public-right-rail__recent-link {
  color: var(--color-muted);
}

:root[data-theme='dark'] .public-right-rail__chips a:hover,
:root[data-theme='dark'] .public-right-rail__chips a.is-active,
:root[data-theme='dark'] .public-right-rail__links a:hover,
:root[data-theme='dark'] .public-right-rail__links a.is-active,
:root[data-theme='dark'] .public-right-rail__recent-link:hover {
  color: var(--color-text);
}

@media (max-width: 1080px) {
  .public-right-rail {
    position: static;
  }
}
</style>
