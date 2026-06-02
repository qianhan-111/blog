<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'
import type { ArticleSummary } from '@/types/article'

const props = defineProps<{
  article: ArticleSummary
}>()

const router = useRouter()

const hasArticleDetailRoute = computed(() => router.hasRoute(ROUTE_NAMES.articleDetail))
const hasAuthorProfileRoute = computed(() => router.hasRoute(ROUTE_NAMES.authorProfile))

const articleLink = computed(() =>
  hasArticleDetailRoute.value
    ? { name: ROUTE_NAMES.articleDetail, params: { id: props.article.id } }
    : null,
)

const authorLink = computed(() =>
  hasAuthorProfileRoute.value
    ? { name: ROUTE_NAMES.authorProfile, params: { id: props.article.authorId } }
    : null,
)

const formattedPublishTime = computed(() => {
  const publishDate = new Date(props.article.publishTime)

  return Number.isNaN(publishDate.getTime())
    ? props.article.publishTime
    : new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      }).format(publishDate)
})

const authorName = computed(() => props.article.author.nickname || props.article.author.username)
</script>

<template>
  <article class="article-card">
    <div class="article-card__body">
      <p class="article-card__meta">
        <RouterLink v-if="authorLink" class="article-card__author" :to="authorLink">
          {{ authorName }}
        </RouterLink>
        <span v-else class="article-card__author">{{ authorName }}</span>
        <span class="article-card__dot" aria-hidden="true">·</span>
        <time :datetime="article.publishTime">{{ formattedPublishTime }}</time>
      </p>

      <h2 class="article-card__title">
        <RouterLink v-if="articleLink" :to="articleLink">{{ article.title }}</RouterLink>
        <span v-else>{{ article.title }}</span>
      </h2>

      <p class="article-card__summary">{{ article.summary }}</p>
    </div>

    <RouterLink
      v-if="article.coverUrl && articleLink"
      class="article-card__cover"
      :to="articleLink"
      aria-label="打开文章"
    >
      <img :src="article.coverUrl" :alt="article.title" loading="lazy" />
    </RouterLink>
  </article>
</template>

<style scoped>
.article-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 0.9rem;
  padding: 0.95rem 1rem;
  border-bottom: 1px solid var(--public-feed-divider);
  background: transparent;
  transition: background-color 160ms ease;
}

.article-card:hover {
  background: var(--public-hover-background);
}

.article-card__cover {
  overflow: hidden;
  width: 6.25rem;
  height: 4.75rem;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-module);
}

.article-card__cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-card__body {
  display: grid;
  gap: 0.45rem;
  min-width: 0;
}

.article-card__meta,
.article-card__title,
.article-card__summary {
  margin: 0;
}

.article-card__meta {
  display: inline-flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  color: var(--color-muted);
  font-size: 0.85rem;
}

.article-card__author {
  font-weight: 700;
  text-decoration: none;
}

.article-card__dot {
  color: var(--color-border);
}

.article-card__title {
  font-size: 1.08rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.article-card__title a {
  color: inherit;
  text-decoration: none;
}

.article-card__title a:hover,
.article-card__author:hover {
  color: var(--color-accent-strong);
}

.article-card__summary {
  color: var(--color-muted);
  line-height: 1.55;
  overflow-wrap: anywhere;
}

:root[data-theme='dark'] .article-card__title a:hover,
:root[data-theme='dark'] .article-card__author:hover {
  color: var(--color-accent);
}

@media (max-width: 960px) {
  .article-card {
    grid-template-columns: minmax(0, 1fr) auto;
  }
}

@media (max-width: 640px) {
  .article-card {
    grid-template-columns: 1fr;
    padding: 0.85rem 0.75rem;
  }

  .article-card__cover {
    display: none;
  }
}
</style>
