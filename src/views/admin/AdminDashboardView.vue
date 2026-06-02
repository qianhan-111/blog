<template>
  <section class="admin-dashboard-view">
    <header class="surface-card admin-dashboard-view__hero">
      <p class="admin-dashboard-view__eyebrow">管理员后台</p>
      <h1 class="admin-dashboard-view__title">全站治理入口</h1>
      <p class="admin-dashboard-view__copy">进入文章、分类、标签和用户管理</p>
    </header>

    <section class="admin-dashboard-view__grid">
      <RouterLink class="surface-card admin-dashboard-view__card" to="/admin/articles">
        <p class="admin-dashboard-view__card-eyebrow">内容治理</p>
        <h2>文章管理</h2>
        <p>筛选、查看、编辑或删除全站内容</p>
      </RouterLink>

      <RouterLink class="surface-card admin-dashboard-view__card" to="/admin/categories">
        <p class="admin-dashboard-view__card-eyebrow">结构维护</p>
        <h2>分类管理</h2>
        <p>维护分类选项</p>
      </RouterLink>

      <RouterLink class="surface-card admin-dashboard-view__card" to="/admin/tags">
        <p class="admin-dashboard-view__card-eyebrow">结构维护</p>
        <h2>标签管理</h2>
        <p>维护标签字典</p>
      </RouterLink>

      <RouterLink class="surface-card admin-dashboard-view__card" to="/admin/users">
        <p class="admin-dashboard-view__card-eyebrow">用户治理</p>
        <h2>用户管理</h2>
        <p>查看用户详情并调整状态</p>
      </RouterLink>
    </section>
  </section>
</template>

<style scoped>
.admin-dashboard-view {
  display: grid;
  gap: 1.5rem;
}

.admin-dashboard-view__hero,
.admin-dashboard-view__card {
  padding: 1.5rem;
}

.admin-dashboard-view__eyebrow,
.admin-dashboard-view__title,
.admin-dashboard-view__copy,
.admin-dashboard-view__card-eyebrow,
.admin-dashboard-view__card h2,
.admin-dashboard-view__card p {
  margin: 0;
}

.admin-dashboard-view__eyebrow,
.admin-dashboard-view__card-eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.admin-dashboard-view__title {
  margin-top: 0.5rem;
  font-size: clamp(2rem, 4vw, 2.8rem);
}

.admin-dashboard-view__copy,
.admin-dashboard-view__card p {
  margin-top: 0.8rem;
  color: var(--color-muted);
}

.admin-dashboard-view__grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.admin-dashboard-view__card {
  color: inherit;
  text-decoration: none;
  min-width: 0;
}

.admin-dashboard-view__card h2 {
  margin-top: 0.55rem;
  font-size: 1.3rem;
}

@media (max-width: 900px) {
  .admin-dashboard-view__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .admin-dashboard-view__grid {
    grid-template-columns: 1fr;
  }
}
</style>
