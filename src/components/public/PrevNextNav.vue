<script setup lang="ts">
import { RouterLink, useRouter } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'
import type { ArticlePrevNext } from '@/types/article'

defineProps<{
  items: ArticlePrevNext
}>()

const router = useRouter()
</script>

<template>
  <nav class="prev-next-nav" aria-label="上下篇导航">
    <div class="prev-next-nav__item">
      <p class="prev-next-nav__label">上一篇</p>
      <RouterLink
        v-if="items.prev && router.hasRoute(ROUTE_NAMES.articleDetail)"
        class="prev-next-nav__link"
        :to="{ name: ROUTE_NAMES.articleDetail, params: { id: items.prev.id } }"
      >
        {{ items.prev.title }}
      </RouterLink>
      <p v-else class="prev-next-nav__empty">已经是第一篇</p>
    </div>

    <div class="prev-next-nav__item prev-next-nav__item--align-end">
      <p class="prev-next-nav__label">下一篇</p>
      <RouterLink
        v-if="items.next && router.hasRoute(ROUTE_NAMES.articleDetail)"
        class="prev-next-nav__link"
        :to="{ name: ROUTE_NAMES.articleDetail, params: { id: items.next.id } }"
      >
        {{ items.next.title }}
      </RouterLink>
      <p v-else class="prev-next-nav__empty">已经是最后一篇</p>
    </div>
  </nav>
</template>

<style scoped>
.prev-next-nav {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-module);
  background: var(--public-module-background);
}

.prev-next-nav__item {
  display: grid;
  gap: 0.35rem;
  padding: 0.85rem 1rem;
}

.prev-next-nav__item + .prev-next-nav__item {
  border-left: 1px solid var(--public-feed-divider);
}

.prev-next-nav__item--align-end {
  text-align: right;
}

.prev-next-nav__label,
.prev-next-nav__empty {
  margin: 0;
}

.prev-next-nav__label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--color-muted);
}

.prev-next-nav__link {
  color: inherit;
  text-decoration: none;
  font-size: 0.98rem;
  font-weight: 650;
}

.prev-next-nav__empty {
  color: var(--color-muted);
}

@media (max-width: 720px) {
  .prev-next-nav {
    grid-template-columns: 1fr;
  }

  .prev-next-nav__item + .prev-next-nav__item {
    border-top: 1px solid var(--public-feed-divider);
    border-left: 0;
  }

  .prev-next-nav__item--align-end {
    text-align: left;
  }
}
</style>
