<script setup lang="ts">
import { Filter, Search } from '@element-plus/icons-vue'
import { computed, ref } from 'vue'

import type { Category } from '@/types/category'
import type { PublicArticleListFilterState } from '@/types/article'
import type { Tag } from '@/types/tag'

const props = defineProps<{
  filters: PublicArticleListFilterState
  categories: Category[]
  tags: Tag[]
  taxonomyLoading?: boolean
  taxonomyError?: string | null
}>()

const emit = defineEmits<{
  'update:filters': [filters: PublicArticleListFilterState]
  apply: []
  clear: []
}>()

const isExpanded = ref(false)

function emitFilters(partial: Partial<PublicArticleListFilterState>) {
  emit('update:filters', {
    ...props.filters,
    ...partial,
  })
}

function updateSelectedIds(
  event: Event,
  key: 'categoryIds' | 'tagIds',
) {
  const target = event.target as HTMLSelectElement
  const nextIds = Array.from(target.selectedOptions)
    .map((option) => Number.parseInt(option.value, 10))
    .filter((value) => Number.isInteger(value) && value > 0)

  emitFilters({ [key]: nextIds } as Pick<PublicArticleListFilterState, typeof key>)
}

const activeFilterCount = computed(() => {
  let count = 0

  if (props.filters.keyword.trim()) {
    count += 1
  }

  if (props.filters.categoryIds.length > 0) {
    count += 1
  }

  if (props.filters.tagIds.length > 0) {
    count += 1
  }

  if (props.filters.sortField) {
    count += 1
  }

  if (props.filters.sortOrder) {
    count += 1
  }

  return count
})
</script>

<template>
  <aside class="article-filter-panel public-side-module" data-test="advanced-filter-panel">
    <div class="article-filter-panel__header">
      <div class="article-filter-panel__heading">
        <span class="article-filter-panel__icon" aria-hidden="true">
          <Filter />
        </span>
        <h2 class="article-filter-panel__title">高级筛选</h2>
        <p class="article-filter-panel__status">
          已选 {{ activeFilterCount }}
          <span v-if="taxonomyLoading"> / 加载中</span>
        </p>
      </div>

      <button
        class="article-filter-panel__toggle"
        type="button"
        :aria-expanded="isExpanded"
        aria-controls="article-filter-panel-body"
        @click="isExpanded = !isExpanded"
      >
        {{ isExpanded ? '收起' : '展开' }}
      </button>
    </div>

    <form
      v-show="isExpanded"
      id="article-filter-panel-body"
      class="article-filter-panel__form"
      data-test="apply-filters"
      @submit.prevent="$emit('apply')"
    >
      <label class="article-filter-panel__field">
        <span>关键词</span>
        <span class="article-filter-panel__search-control">
          <Search aria-hidden="true" />
          <input
            data-test="keyword-input"
            class="article-filter-panel__input"
            type="search"
            :value="filters.keyword"
            placeholder="关键词"
            @input="
              emitFilters({
                keyword: ($event.target as HTMLInputElement).value,
              })
            "
          />
        </span>
      </label>

      <label class="article-filter-panel__field">
        <span>分类</span>
        <select
          class="article-filter-panel__select article-filter-panel__select--multi"
          multiple
          :value="filters.categoryIds.map(String)"
          @change="updateSelectedIds($event, 'categoryIds')"
        >
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ category.name }}
          </option>
        </select>
      </label>

      <label class="article-filter-panel__field">
        <span>标签</span>
        <select
          class="article-filter-panel__select article-filter-panel__select--multi"
          multiple
          :value="filters.tagIds.map(String)"
          @change="updateSelectedIds($event, 'tagIds')"
        >
          <option v-for="tag in tags" :key="tag.id" :value="tag.id">
            {{ tag.name }}
          </option>
        </select>
      </label>

      <div class="article-filter-panel__row">
        <label class="article-filter-panel__field">
          <span>排序字段</span>
          <select
            class="article-filter-panel__select"
            :value="filters.sortField ?? ''"
            @change="
              emitFilters({
                sortField:
                  (($event.target as HTMLSelectElement).value || undefined) as
                    | PublicArticleListFilterState['sortField']
                    | undefined,
              })
            "
          >
            <option value="">默认</option>
            <option value="publishTime">发布</option>
            <option value="updateTime">更新</option>
          </select>
        </label>

        <label class="article-filter-panel__field">
          <span>排序方向</span>
          <select
            class="article-filter-panel__select"
            :value="filters.sortOrder ?? ''"
            @change="
              emitFilters({
                sortOrder:
                  (($event.target as HTMLSelectElement).value || undefined) as
                    | PublicArticleListFilterState['sortOrder']
                    | undefined,
              })
            "
          >
            <option value="">默认</option>
            <option value="desc">降序</option>
            <option value="asc">升序</option>
          </select>
        </label>
      </div>

      <p v-if="taxonomyError" class="article-filter-panel__feedback">
        {{ taxonomyError }}
      </p>

      <div class="article-filter-panel__actions">
        <button class="article-filter-panel__apply" type="submit">应用</button>
        <button
          data-test="clear-filters"
          class="article-filter-panel__clear"
          type="button"
          @click="$emit('clear')"
        >
          清空
        </button>
      </div>
    </form>
  </aside>
</template>

<style scoped>
.article-filter-panel {
  display: grid;
  gap: 0.75rem;
}

.article-filter-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
}

.article-filter-panel__heading {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: 0.35rem 0.55rem;
  align-items: center;
}

.article-filter-panel__icon {
  display: grid;
  place-items: center;
  grid-row: span 2;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: var(--public-radius-compact);
  background: var(--public-hover-background);
  color: var(--color-accent-strong);
}

.article-filter-panel__icon :deep(svg) {
  width: 1rem;
  height: 1rem;
}

.article-filter-panel__title,
.article-filter-panel__status,
.article-filter-panel__feedback {
  margin: 0;
}

.article-filter-panel__title {
  font-size: 0.96rem;
}

.article-filter-panel__status {
  color: var(--color-muted);
  font-size: 0.84rem;
}

.article-filter-panel__toggle,
.article-filter-panel__apply,
.article-filter-panel__clear {
  min-height: 2.25rem;
  border-radius: var(--public-radius-compact);
  font-weight: 650;
  cursor: pointer;
}

.article-filter-panel__toggle,
.article-filter-panel__clear {
  border: 1px solid var(--public-feed-divider);
  background: transparent;
  color: var(--color-text);
}

.article-filter-panel__form {
  display: grid;
  gap: 0.75rem;
}

.article-filter-panel__field {
  display: grid;
  gap: 0.35rem;
  color: var(--color-muted);
  font-size: 0.86rem;
}

.article-filter-panel__input,
.article-filter-panel__select {
  min-height: 2.3rem;
  width: 100%;
  padding: 0.45rem 0.6rem;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-compact);
  background: var(--color-input-background);
  color: var(--color-text);
}

.article-filter-panel__search-control {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  border: 1px solid var(--public-feed-divider);
  border-radius: var(--public-radius-compact);
  background: var(--color-input-background);
}

.article-filter-panel__search-control :deep(svg) {
  width: 1rem;
  height: 1rem;
  margin-inline: 0.6rem 0.1rem;
  color: var(--color-muted);
}

.article-filter-panel__search-control .article-filter-panel__input {
  border: 0;
  background: transparent;
  padding-left: 0.35rem;
}

.article-filter-panel__select--multi {
  min-height: 5.8rem;
}

.article-filter-panel__row {
  display: grid;
  gap: 0.65rem;
}

.article-filter-panel__feedback {
  color: var(--color-danger);
  font-size: 0.9rem;
}

.article-filter-panel__actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
}

.article-filter-panel__apply {
  border: 0;
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
}

@media (max-width: 960px) {
  .article-filter-panel__row {
    grid-template-columns: 1fr;
  }
}
</style>
