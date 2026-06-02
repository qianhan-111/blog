<script setup lang="ts">
defineProps<{
  title?: string
  message?: string
  recoveryMessage?: string
  retrying?: boolean
  retryLabel?: string
  retryingLabel?: string
  actionHref?: string
  actionLabel?: string
}>()

defineEmits<{
  retry: []
}>()
</script>

<template>
  <section class="error-state" role="alert" aria-live="assertive" aria-atomic="true" :aria-busy="retrying ? 'true' : 'false'">
    <div class="error-state__icon" aria-hidden="true">!</div>
    <div class="error-state__copy">
      <h2 class="error-state__title">{{ title || '加载失败' }}</h2>
      <p class="error-state__message">
        {{ message || '暂时不可用，请重试' }}
      </p>
      <p v-if="recoveryMessage" class="error-state__recovery">
        {{ recoveryMessage }}
      </p>
    </div>
    <div class="error-state__actions">
      <button class="error-state__action" type="button" :disabled="retrying" @click="$emit('retry')">
        {{ retrying ? retryingLabel || '正在重试' : retryLabel || '重新加载' }}
      </button>
      <RouterLink v-if="actionHref && actionLabel" class="error-state__action error-state__action--link" :to="actionHref">
        {{ actionLabel }}
      </RouterLink>
    </div>
  </section>
</template>

<style scoped>
.error-state {
  display: grid;
  justify-items: center;
  gap: 0.75rem;
  padding: 2rem 1rem;
  border-block: 1px solid var(--public-feed-divider, var(--color-border));
  text-align: center;
}

.error-state__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid color-mix(in srgb, var(--color-danger) 38%, transparent);
  border-radius: var(--public-radius-compact, 8px);
  background: transparent;
  color: var(--color-danger);
  font-weight: 800;
  font-size: 1rem;
}

.error-state__copy {
  display: grid;
  gap: 0.4rem;
}

.error-state__actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
}

.error-state__title,
.error-state__message,
.error-state__recovery {
  margin: 0;
}

.error-state__message,
.error-state__recovery {
  color: var(--color-muted);
  font-size: 0.92rem;
}

.error-state__action {
  min-height: 2.25rem;
  padding: 0.45rem 0.75rem;
  border: 0;
  border-radius: var(--public-radius-compact, 8px);
  background: var(--color-surface-strong);
  color: var(--color-on-surface-strong);
  font-weight: 700;
  cursor: pointer;
}

.error-state__action:disabled {
  opacity: 0.65;
  cursor: wait;
}

.error-state__action--link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
</style>
