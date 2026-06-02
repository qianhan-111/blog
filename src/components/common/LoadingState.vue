<script setup lang="ts">
defineProps<{
  title?: string
  message?: string
}>()
</script>

<template>
  <section class="loading-state" role="status" aria-live="polite" aria-busy="true">
    <span class="loading-state__spinner" aria-hidden="true" />
    <div class="loading-state__copy">
      <h2 class="loading-state__title">{{ title || '加载中' }}</h2>
      <p class="loading-state__message">{{ message || '请稍候' }}</p>
    </div>
  </section>
</template>

<style scoped>
.loading-state {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  border-block: 1px solid var(--public-feed-divider, var(--color-border));
  text-align: center;
}

.loading-state__spinner {
  width: 1.75rem;
  height: 1.75rem;
  border: 2px solid color-mix(in srgb, var(--color-muted) 22%, transparent);
  border-top-color: var(--color-accent-strong);
  border-radius: 50%;
  animation: loading-state-spin 0.85s linear infinite;
}

.loading-state__copy {
  display: grid;
  gap: 0.4rem;
}

.loading-state__title,
.loading-state__message {
  margin: 0;
}

.loading-state__title {
  font-size: 1rem;
}

.loading-state__message {
  color: var(--color-muted);
  font-size: 0.92rem;
}

@keyframes loading-state-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
