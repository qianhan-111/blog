<script setup lang="ts">
import RouteViewTransition from '@/components/common/RouteViewTransition.vue'
import SiteHeader from '@/components/layout/SiteHeader.vue'

const appTitle = import.meta.env.VITE_APP_TITLE || '博客平台'
</script>

<template>
  <div class="public-layout public-page-shell">
    <SiteHeader :brand-name="appTitle">
      <template #logo>博</template>
    </SiteHeader>

    <main class="public-layout__content public-container">
      <RouteViewTransition />
    </main>
  </div>
</template>

<style scoped>
.public-layout {
  min-height: 100vh;
  padding-top: 58px;
  background: var(--public-page-background);
  color: var(--color-text);
}

.public-layout__content {
  width: min(100% - 2rem, 1280px);
  padding-block: 1rem 1.5rem;
}

.public-layout__content:has(.auth-card-shell) {
  width: 100%;
  padding-block: 0;
  --auth-card-shell-min-height: calc(100svh - 58px);
  --auth-card-shell-max-height: calc(100svh - 58px);
}

@media (max-width: 768px) {
  .public-layout__content {
    width: min(100% - 1rem, 1280px);
    padding-block: 0.75rem 1rem;
  }

  .public-layout__content:has(.auth-card-shell) {
    width: 100%;
    padding-block: 0;
  }
}
</style>
