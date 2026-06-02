<script setup lang="ts">
import SiteFooter from '@/components/layout/SiteFooter.vue'

withDefaults(
  defineProps<{
    siteName?: string
  }>(),
  {
    siteName: '博客平台',
  },
)
</script>

<template>
  <section class="public-rail-footer" aria-label="站点信息">
    <SiteFooter :site-name="siteName" />
  </section>
</template>

<style scoped>
.public-rail-footer {
  padding: var(--public-space-module);
  color: var(--color-muted);
  font-size: 0.86rem;
}
</style>
