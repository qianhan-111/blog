<script setup lang="ts">
import { RouterLink } from 'vue-router'

import RouteViewTransition from '@/components/common/RouteViewTransition.vue'
import ThemeToggle from '@/components/common/ThemeToggle.vue'
</script>

<template>
  <div class="admin-layout">
    <aside class="admin-layout__sidebar surface-card">
      <div class="admin-layout__sidebar-header">
        <p class="admin-layout__eyebrow">管理区</p>
        <ThemeToggle />
      </div>

      <div>
        <h1 class="admin-layout__title">控制台</h1>
      </div>

      <nav class="admin-layout__nav">
        <RouterLink class="admin-layout__link" to="/admin">总览</RouterLink>
        <RouterLink class="admin-layout__link" to="/admin/articles">文章</RouterLink>
        <RouterLink class="admin-layout__link" to="/admin/categories">分类</RouterLink>
        <RouterLink class="admin-layout__link" to="/admin/tags">标签</RouterLink>
        <RouterLink class="admin-layout__link" to="/admin/users">用户</RouterLink>
      </nav>

      <RouterLink class="admin-layout__home" to="/">返回首页</RouterLink>
    </aside>

    <section class="admin-layout__content">
      <RouteViewTransition />
    </section>
  </div>
</template>

<style scoped>
.admin-layout {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(16rem, 18rem) minmax(0, 1fr);
  gap: 1rem;
  padding: 1rem;
  background: color-mix(in srgb, var(--color-surface-strong) 92%, var(--color-background));
  color: var(--color-text);
}

.admin-layout__sidebar {
  position: sticky;
  top: 1rem;
  display: grid;
  align-content: start;
  gap: 1rem;
  height: fit-content;
  padding: 1.5rem;
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--color-surface-strong) 95%, transparent), color-mix(in srgb, var(--color-surface) 15%, transparent)),
    var(--color-surface-strong);
  color: var(--color-on-surface-strong);
}

.admin-layout__sidebar-header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
}

.admin-layout__eyebrow,
.admin-layout__title {
  margin: 0;
}

.admin-layout__eyebrow {
  font-size: 0.875rem;
  color: color-mix(in srgb, var(--color-on-surface-strong) 72%, transparent);
}

.admin-layout__title {
  margin-top: 0.35rem;
  font-size: 1.75rem;
}

.admin-layout__nav {
  display: grid;
  gap: 0.6rem;
}

.admin-layout__link {
  color: inherit;
  text-decoration: none;
  font-weight: 600;
  padding: 0.75rem 0.9rem;
  border-radius: 999px;
  background: color-mix(in srgb, var(--color-surface) 10%, transparent);
}

.admin-layout__link:hover {
  background: color-mix(in srgb, var(--color-accent) 22%, transparent);
}

.admin-layout__home {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-height: 2.9rem;
  padding: 0.8rem 1rem;
  border-radius: 999px;
  background: var(--color-surface);
  color: var(--color-text);
  text-decoration: none;
  font-weight: 700;
}

.admin-layout__content {
  min-width: 0;
  padding: 1rem 0 2rem;
}

@media (max-width: 1024px) {
  .admin-layout {
    grid-template-columns: 1fr;
  }

  .admin-layout__sidebar {
    position: static;
  }

  .admin-layout__nav {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .admin-layout {
    padding: 0.75rem;
  }

  .admin-layout__sidebar {
    padding: 1rem;
  }

  .admin-layout__nav {
    grid-template-columns: 1fr;
  }
}
</style>
