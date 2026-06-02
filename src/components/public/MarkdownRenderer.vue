<script setup lang="ts">
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { MdCatalog, MdPreview } from 'md-editor-v3'

import { useThemeStore } from '@/stores/theme'
import { hasMarkdownHeadings, sanitizeMarkdownHtml } from '@/utils/markdown'

const props = withDefaults(
  defineProps<{
    previewId?: string
    modelValue: string
    showCatalog?: boolean
  }>(),
  {
    previewId: 'article-preview',
    showCatalog: false,
  },
)

const themeStore = useThemeStore()
const { theme } = storeToRefs(themeStore)

const scrollElement = typeof document === 'undefined' ? 'html' : document.documentElement
const containsHeadings = computed(() => hasMarkdownHeadings(props.modelValue))

// This client-side sanitizer removes obvious unsafe markup, but backend sanitization is still required for untrusted content.
function handleSanitize(html: string) {
  return sanitizeMarkdownHtml(html)
}
</script>

<template>
  <div class="markdown-renderer">
    <div class="markdown-renderer__surface">
      <MdPreview
        class="md-editor-previewOnly"
        :id="previewId"
        :model-value="modelValue"
        :theme="theme"
        preview-theme="github"
        code-theme="atom"
        :sanitize="handleSanitize"
      />
    </div>

    <aside
      v-if="showCatalog && containsHeadings"
      class="markdown-renderer__catalog"
      aria-label="文章目录"
    >
      <p class="markdown-renderer__catalog-title">目录导航</p>
      <div class="markdown-renderer__catalog-card">
        <MdCatalog
          :editor-id="previewId"
          :scroll-element="scrollElement"
          :theme="theme"
        />
      </div>
    </aside>
  </div>
</template>
