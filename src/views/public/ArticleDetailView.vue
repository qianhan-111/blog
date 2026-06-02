<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useWindowScroll } from '@vueuse/core'

import ErrorState from '@/components/common/ErrorState.vue'
import LoadingState from '@/components/common/LoadingState.vue'
import ArticleMetaBar from '@/components/public/ArticleMetaBar.vue'
import MarkdownRenderer from '@/components/public/MarkdownRenderer.vue'
import PrevNextNav from '@/components/public/PrevNextNav.vue'
import PublicRailFooter from '@/components/public/PublicRailFooter.vue'
import { getArticleDetail, getArticlePrevNext } from '@/api/public-articles'
import { useRecentPublicArticlesStore } from '@/stores/recentPublicArticles'
import type { ArticleDetail, ArticlePrevNext } from '@/types/article'
import { getRecoveryMessage, normalizeErrorMessage } from '@/utils/error-message'
import { parsePositiveRouteInteger } from '@/utils/route-params'

const route = useRoute()
const { y } = useWindowScroll()
const appTitle = import.meta.env.VITE_APP_TITLE || '博客平台'
const recentPublicArticlesStore = useRecentPublicArticlesStore()

const article = ref<ArticleDetail | null>(null)
const prevNext = ref<ArticlePrevNext>({
  prev: null,
  next: null,
})
const loading = ref(false)
const loadError = ref('')
const loadRecovery = ref('')
const isRetryingLoad = ref(false)
let latestArticleRequestId = 0

const articleId = computed(() => parsePositiveRouteInteger(route.params.id))
const authorName = computed(() => article.value?.author.nickname || article.value?.author.username || '')
const recentArticles = computed(() => recentPublicArticlesStore.items.slice(0, 5))
const showBackToTop = computed(() => y.value > 480)

async function fetchArticle() {
  const requestId = ++latestArticleRequestId
  const requestedArticleId = articleId.value

  if (requestedArticleId === null) {
    article.value = null
    prevNext.value = {
      prev: null,
      next: null,
    }
    loadError.value = '无效的文章编号'
    loadRecovery.value = ''
    isRetryingLoad.value = false
    loading.value = false
    return
  }

  isRetryingLoad.value = !article.value && Boolean(loadError.value)
  loading.value = true

  try {
    const detail = await getArticleDetail(requestedArticleId)

    if (requestId !== latestArticleRequestId || articleId.value !== requestedArticleId) {
      return
    }

    article.value = detail
    prevNext.value = {
      prev: null,
      next: null,
    }
    loadError.value = ''
    loadRecovery.value = ''
    loading.value = false
    recentPublicArticlesStore.trackArticle(detail)

    try {
      const neighbours = await getArticlePrevNext(requestedArticleId)

      if (requestId !== latestArticleRequestId || articleId.value !== requestedArticleId) {
        return
      }

      prevNext.value = neighbours
    } catch {
      if (requestId !== latestArticleRequestId || articleId.value !== requestedArticleId) {
        return
      }

      prevNext.value = {
        prev: null,
        next: null,
      }
    }
  } catch (caughtError) {
    if (requestId !== latestArticleRequestId || articleId.value !== requestedArticleId) {
      return
    }

    article.value = null
    prevNext.value = {
      prev: null,
      next: null,
    }
    loadError.value = normalizeErrorMessage(caughtError, '文章加载失败')
    loadRecovery.value = getRecoveryMessage(caughtError)
  } finally {
    if (requestId === latestArticleRequestId && articleId.value === requestedArticleId) {
      isRetryingLoad.value = false
      loading.value = false
    }
  }
}

function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth',
  })
}

watch(
  () => route.params.id,
  () => {
    loadError.value = ''
    loadRecovery.value = ''
    isRetryingLoad.value = false
    void fetchArticle()
  },
  {
    immediate: true,
  },
)
</script>

<template>
  <section class="article-detail-view">
    <LoadingState v-if="loading && !loadError" title="加载文章" message="获取正文" />

    <ErrorState
      v-else-if="loadError"
      title="文章不可用"
      :message="loadError"
      :recovery-message="loadRecovery"
      :retrying="isRetryingLoad"
      @retry="fetchArticle"
    />

    <template v-else-if="article">
      <div class="article-detail-view__layout">
        <main class="article-detail-view__main">
          <article class="article-detail-view__article">
            <header class="article-detail-view__header">
              <h1 class="article-detail-view__title">{{ article.title }}</h1>
              <p v-if="article.summary" class="article-detail-view__summary">{{ article.summary }}</p>
            </header>

            <MarkdownRenderer
              :preview-id="`article-preview-${article.id}`"
              :model-value="article.contentMarkdown"
            />
          </article>

          <PrevNextNav :items="prevNext" />
        </main>

        <aside class="article-detail-view__side public-rail" data-test="article-right-rail">
          <section v-if="article.coverUrl" class="public-side-module">
            <img
              class="article-detail-view__cover"
              :src="article.coverUrl"
              :alt="article.title"
            />
          </section>

          <section class="public-side-module article-detail-view__meta">
            <h2 class="article-detail-view__side-title">信息</h2>
            <ArticleMetaBar
              :author-id="article.authorId"
              :author-name="authorName"
              :publish-time="article.publishTime"
              :updated-at="article.updatedAt"
              :categories="article.categories"
              :tags="article.tags"
            />
          </section>

          <section class="public-side-module article-detail-view__recent">
            <h2 class="article-detail-view__side-title">最近浏览</h2>
            <div v-if="recentArticles.length > 0" class="public-side-list">
              <RouterLink
                v-for="recentArticle in recentArticles"
                :key="recentArticle.id"
                class="public-side-link"
                :to="`/articles/${recentArticle.id}`"
              >
                <strong>{{ recentArticle.title }}</strong>
                <span>{{ recentArticle.authorName }}</span>
              </RouterLink>
            </div>
            <p v-else class="article-detail-view__muted">还没有浏览记录</p>
          </section>

          <PublicRailFooter :site-name="appTitle" />
        </aside>
      </div>

      <button
        v-if="showBackToTop"
        class="article-detail-view__back-to-top"
        type="button"
        @click="scrollToTop"
      >
        返回顶部
      </button>
    </template>
  </section>
</template>

<style scoped>
.article-detail-view {
  min-width: 0;
}

.article-detail-view__layout {
  display: grid;
  grid-template-columns: minmax(0, 48rem) minmax(16rem, 20rem);
  gap: var(--public-space-module);
  align-items: start;
  max-width: 1120px;
  margin: 0 auto;
}

.article-detail-view__main {
  display: grid;
  gap: var(--public-space-module);
  min-width: 0;
}

.article-detail-view__article {
  display: grid;
  gap: 0;
  overflow: hidden;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-module);
  background: var(--public-module-background);
}

.article-detail-view__header {
  display: grid;
  gap: 0.65rem;
  padding: clamp(1rem, 2vw, 1.35rem);
  border-bottom: 1px solid var(--public-feed-divider);
}

.article-detail-view__title,
.article-detail-view__summary,
.article-detail-view__side-title {
  margin: 0;
}

.article-detail-view__title {
  font-size: clamp(1.75rem, 4vw, 2.65rem);
  line-height: 1.12;
}

.article-detail-view__summary {
  max-width: 62ch;
  color: var(--color-muted);
  line-height: 1.6;
}

.article-detail-view__side {
  position: sticky;
  top: 74px;
}

.article-detail-view__cover {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: var(--public-radius-compact);
}

.article-detail-view__meta {
  display: grid;
  gap: 0.75rem;
}

.article-detail-view__recent {
  display: grid;
  gap: 0.75rem;
}

.article-detail-view__side-title {
  font-size: 0.94rem;
}

.article-detail-view__muted {
  margin: 0;
  color: var(--color-muted);
  font-size: 0.92rem;
}

.article-detail-view__back-to-top {
  position: fixed;
  right: 1.5rem;
  bottom: 1.5rem;
  min-height: 2.4rem;
  padding: 0.55rem 0.8rem;
  border: 0;
  border-radius: var(--public-radius-compact);
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-weight: 650;
  cursor: pointer;
}

@media (max-width: 900px) {
  .article-detail-view__layout {
    grid-template-columns: 1fr;
  }

  .article-detail-view__side {
    position: static;
  }
}

@media (max-width: 640px) {
  .article-detail-view__back-to-top {
    right: 1rem;
    bottom: 1rem;
  }
}
</style>
