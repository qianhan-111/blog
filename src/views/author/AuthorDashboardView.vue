<template>
  <section class="author-dashboard-view">
    <header class="surface-card author-dashboard-view__hero">
      <p class="author-dashboard-view__eyebrow">作者后台</p>
      <h1 class="author-dashboard-view__title">继续你的写作流程</h1>
      <p class="author-dashboard-view__copy">快捷进入文章、写作和资料</p>
    </header>

    <section class="author-dashboard-view__grid">
      <RouterLink class="surface-card author-dashboard-view__card" to="/writer/articles">
        <p class="author-dashboard-view__card-eyebrow">内容管理</p>
        <h2>我的文章</h2>
        <p>查看和管理文章</p>
      </RouterLink>

      <RouterLink class="surface-card author-dashboard-view__card" to="/writer/articles/new">
        <p class="author-dashboard-view__card-eyebrow">开始写作</p>
        <h2>新建文章</h2>
        <p>保存草稿或发布</p>
      </RouterLink>

      <RouterLink class="surface-card author-dashboard-view__card" to="/profile">
        <p class="author-dashboard-view__card-eyebrow">账户信息</p>
        <h2>个人资料</h2>
        <p>维护公开资料</p>
      </RouterLink>
    </section>
  </section>
</template>

<style scoped>
.author-dashboard-view {
  display: grid;
  gap: 1.5rem;
}

.author-dashboard-view__hero,
.author-dashboard-view__card {
  padding: 1.5rem;
}

.author-dashboard-view__eyebrow,
.author-dashboard-view__title,
.author-dashboard-view__copy,
.author-dashboard-view__card-eyebrow,
.author-dashboard-view__card h2,
.author-dashboard-view__card p {
  margin: 0;
}

.author-dashboard-view__eyebrow,
.author-dashboard-view__card-eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.author-dashboard-view__title {
  margin-top: 0.5rem;
  font-size: clamp(2rem, 4vw, 2.8rem);
}

.author-dashboard-view__copy,
.author-dashboard-view__card p {
  margin-top: 0.8rem;
  color: var(--color-muted);
}

.author-dashboard-view__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.author-dashboard-view__card {
  color: inherit;
  text-decoration: none;
  min-width: 0;
}

.author-dashboard-view__card h2 {
  margin-top: 0.55rem;
  font-size: 1.3rem;
}

@media (max-width: 900px) {
  .author-dashboard-view__grid {
    grid-template-columns: 1fr;
  }
}
</style>
