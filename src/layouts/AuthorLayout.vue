<script setup lang="ts">
import { RouterLink } from 'vue-router'

import RouteViewTransition from '@/components/common/RouteViewTransition.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
</script>

<template>
  <div class="dashboard-layout">
    <aside class="dashboard-layout__sidebar surface-card">
      <div class="dashboard-layout__sidebar-header">
        <p class="dashboard-layout__eyebrow">作者区</p>
        <ThemeToggle />
      </div>
      <RouterLink class="dashboard-layout__link" to="/writer">仪表页</RouterLink>
      <RouterLink class="dashboard-layout__link" to="/writer/articles">我的文章</RouterLink>
      <RouterLink class="dashboard-layout__link" to="/profile">个人资料</RouterLink>
    </aside>

    <main class="dashboard-layout__content">
      <RouteViewTransition />
    </main>
  </div>
</template>

<style scoped>
.dashboard-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(14rem, 16rem) minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: transparent;
  color: var(--color-text);
}

.dashboard-layout__sidebar {
  display: grid;
  align-content: start;
  gap: 0.75rem;
  padding: 1.5rem;
  position: sticky;
  top: 1rem;
  height: fit-content;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface-strong) 94%, transparent), color-mix(in srgb, var(--color-surface) 24%, transparent)),
    var(--color-surface-strong);
  color: var(--color-on-surface-strong);
}

.dashboard-layout__sidebar-header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.dashboard-layout__eyebrow {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  opacity: 0.8;
}

.dashboard-layout__link {
  color: inherit;
  text-decoration: none;
  padding: 0.75rem 0.9rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-surface) 10%, transparent);
}

.dashboard-layout__link:hover {
  background: color-mix(in srgb, var(--color-accent) 22%, transparent);
}

.dashboard-layout__content {
  min-width: 0;
  padding: 1rem 0 2rem;
}

@media (max-width: 1024px) {
  .dashboard-layout {
    grid-template-columns: 1fr;
  }

  .dashboard-layout__sidebar {
    position: static;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    align-items: center;
  }

  .dashboard-layout__sidebar-header {
    grid-column: 1 / -1;
  }
}

@media (max-width: 640px) {
  .dashboard-layout {
    padding: 0.75rem;
  }

  .dashboard-layout__sidebar {
    grid-template-columns: 1fr;
    padding: 1rem;
  }

  .dashboard-layout__content {
    padding-top: 0;
  }
}
</style>
