<script setup lang="ts">
defineProps<{
  title?: string
  message?: string
  actionLabel?: string
}>()

defineEmits<{
  action: []
}>()
</script>

<template>
  <section class="empty-state">
    <div class="empty-state__icon" aria-hidden="true">空</div>
    <div class="empty-state__copy">
      <h2 class="empty-state__title">{{ title || '暂无内容' }}</h2>
      <p class="empty-state__message">
        {{ message || '换个条件再试' }}
      </p>
    </div>
    <button
      v-if="actionLabel"
      class="empty-state__action"
      type="button"
      @click="$emit('action')"
    >
      {{ actionLabel }}
    </button>
  </section>
</template>

<style scoped>
.empty-state {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  border-block: 1px solid var(--public-feed-divider, var(--color-border));
  text-align: center;
}

.empty-state__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid var(--public-feed-divider, var(--color-border));
  border-radius: var(--public-radius-compact, 8px);
  color: var(--color-muted);
  font-weight: 700;
  font-size: 0.82rem;
}

.empty-state__copy {
  display: grid;
  gap: 0.4rem;
}

.empty-state__title,
.empty-state__message {
  margin: 0;
}

.empty-state__message {
  color: var(--color-muted);
  font-size: 0.92rem;
}

.empty-state__action {
  min-height: 2.25rem;
  padding: 0.45rem 0.75rem;
  border: 0;
  border-radius: var(--public-radius-compact, 8px);
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-weight: 700;
  cursor: pointer;
}
</style>
