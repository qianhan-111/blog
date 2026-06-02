<script setup lang="ts">
import { MdEditor } from 'md-editor-v3'
import { storeToRefs } from 'pinia'

import { useThemeStore } from '@/stores/theme'

import type { Category } from '@/types/category'
import type { Tag } from '@/types/tag'

defineProps<{
  form: {
    title: string
    summary: string
    coverUrl: string
    categoryIds: number[]
    tagIds: number[]
    contentMarkdown: string
  }
  categories: Category[]
  tags: Tag[]
}>()

const emit = defineEmits<{
  'update:field': [field: string, value: string | number[]]
}>()

const themeStore = useThemeStore()
const { theme } = storeToRefs(themeStore)

function updateSelectedIds(event: Event, key: 'categoryIds' | 'tagIds') {
  const target = event.target as HTMLSelectElement
  const nextIds = Array.from(target.selectedOptions)
    .map((option) => Number.parseInt(option.value, 10))
    .filter((value) => Number.isInteger(value) && value > 0)

  emit('update:field', key, nextIds)
}

</script>

<template>
  <div class="article-form-fields">
    <section class="surface-card article-form-fields__section">
      <p class="article-form-fields__eyebrow">基础信息区</p>

      <label class="article-form-fields__field">
        <span>标题</span>
        <input
          :value="form.title"
          type="text"
          placeholder="输入文章标题"
          @input="$emit('update:field', 'title', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <label class="article-form-fields__field">
        <span>摘要</span>
        <textarea
          :value="form.summary"
          rows="4"
          placeholder="可选摘要，不填则后端可按正文截取"
          @input="$emit('update:field', 'summary', ($event.target as HTMLTextAreaElement).value)"
        />
      </label>

      <label class="article-form-fields__field">
        <span>封面 URL</span>
        <input
          :value="form.coverUrl"
          type="url"
          placeholder="粘贴封面链接"
          @input="$emit('update:field', 'coverUrl', ($event.target as HTMLInputElement).value)"
        />
      </label>

      <div class="article-form-fields__grid">
        <label class="article-form-fields__field">
          <span>分类</span>
          <select multiple :value="form.categoryIds.map(String)" @change="updateSelectedIds($event, 'categoryIds')">
            <option v-for="category in categories" :key="category.id" :value="category.id">{{ category.name }}</option>
          </select>
        </label>

        <label class="article-form-fields__field">
          <span>标签</span>
          <select multiple :value="form.tagIds.map(String)" @change="updateSelectedIds($event, 'tagIds')">
            <option v-for="tag in tags" :key="tag.id" :value="tag.id">{{ tag.name }}</option>
          </select>
        </label>
      </div>
    </section>

    <section class="surface-card article-form-fields__section">
      <p class="article-form-fields__eyebrow">Markdown 正文编辑区</p>
      <MdEditor
        language="zh-CN"
        :model-value="form.contentMarkdown"
        :theme="theme"
        preview-theme="github"
        code-theme="atom"
        :preview="true"
        :toolbars-exclude="['github']"
        @update:model-value="$emit('update:field', 'contentMarkdown', $event)"
      />
      <p class="article-form-fields__hint">当前使用内置预览</p>
    </section>
  </div>
</template>

<style scoped>
.article-form-fields {
  display: grid;
  gap: 1.5rem;
}

.article-form-fields__section {
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
}

.article-form-fields__eyebrow,
.article-form-fields__hint {
  margin: 0;
}

.article-form-fields__eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.article-form-fields__field {
  display: grid;
  gap: 0.45rem;
}

.article-form-fields__field span {
  font-weight: 700;
}

.article-form-fields__field input,
.article-form-fields__field textarea,
.article-form-fields__field select {
  width: 100%;
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 1rem;
  background: var(--color-input-background);
  color: var(--color-text);
}

.article-form-fields__field select {
  min-height: 10rem;
}

.article-form-fields__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.article-form-fields__hint {
  color: var(--color-muted);
}

.article-form-fields :deep(.md-editor-toolbar) {
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: thin;
}

.article-form-fields :deep(.md-editor-toolbar-wrapper) {
  min-width: 0;
}

@media (max-width: 900px) {
  .article-form-fields__grid {
    grid-template-columns: 1fr;
  }
}
</style>
