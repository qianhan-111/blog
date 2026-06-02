<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'
import type { Category } from '@/types/category'
import type { Tag } from '@/types/tag'

const props = defineProps<{
  authorId: number
  authorName: string
  publishTime: string
  updatedAt?: string
  categories?: Category[]
  tags?: Tag[]
}>()

const router = useRouter()

function formatDate(value: string) {
  const date = new Date(value)

  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(date)
}

const publishLabel = computed(() => formatDate(props.publishTime))
const updatedLabel = computed(() => (props.updatedAt ? formatDate(props.updatedAt) : null))
const hasAuthorRoute = computed(() => router.hasRoute(ROUTE_NAMES.authorProfile))
</script>

<template>
  <section class="article-meta-bar">
    <div class="article-meta-bar__line">
      <RouterLink
        v-if="hasAuthorRoute"
        class="article-meta-bar__author"
        :to="{ name: ROUTE_NAMES.authorProfile, params: { id: authorId } }"
      >
        {{ authorName }}
      </RouterLink>
      <span v-else class="article-meta-bar__author">{{ authorName }}</span>
      <span class="article-meta-bar__dot" aria-hidden="true">·</span>
      <time :datetime="publishTime">发布 {{ publishLabel }}</time>
      <template v-if="updatedLabel">
        <span class="article-meta-bar__dot" aria-hidden="true">·</span>
        <time :datetime="updatedAt">更新 {{ updatedLabel }}</time>
      </template>
    </div>

    <div v-if="categories?.length" class="article-meta-bar__group">
      <span class="article-meta-bar__label">分类</span>
      <ul class="article-meta-bar__chips">
        <li v-for="category in categories" :key="category.id">{{ category.name }}</li>
      </ul>
    </div>

    <div v-if="tags?.length" class="article-meta-bar__group">
      <span class="article-meta-bar__label">标签</span>
      <ul class="article-meta-bar__chips">
        <li v-for="tag in tags" :key="tag.id">{{ tag.name }}</li>
      </ul>
    </div>
  </section>
</template>

<style scoped>
.article-meta-bar {
  display: grid;
  gap: 0.65rem;
}

.article-meta-bar__line {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  min-width: 0;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.article-meta-bar__author {
  color: inherit;
  text-decoration: none;
  font-weight: 700;
  overflow-wrap: anywhere;
}

.article-meta-bar__dot {
  color: var(--color-border);
}

.article-meta-bar__group {
  display: grid;
  gap: 0.55rem;
}

.article-meta-bar__label {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--color-muted);
}

.article-meta-bar__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
  padding: 0;
  margin: 0;
  list-style: none;
}

.article-meta-bar__chips li {
  min-width: 0;
  padding: 0.28rem 0.5rem;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-compact);
  background: transparent;
  color: var(--color-muted);
  font-size: 0.86rem;
  overflow-wrap: anywhere;
}
</style>
