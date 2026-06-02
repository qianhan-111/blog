<script setup lang="ts">
const props = withDefaults(defineProps<{
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  busy?: boolean
  busyLabel?: string
}>(), {
  busy: false,
  busyLabel: '处理中',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

function emitCancel() {
  if (props.busy) {
    return
  }

  emit('cancel')
}

function emitConfirm() {
  if (props.busy) {
    return
  }

  emit('confirm')
}
</script>

<template>
  <div class="confirm-action" role="dialog" aria-modal="true">
    <div class="confirm-action__backdrop" @click="emitCancel" />
    <div class="confirm-action__panel surface-card">
      <p class="confirm-action__eyebrow">危险操作确认</p>
      <h2 class="confirm-action__title">{{ title }}</h2>
      <p class="confirm-action__message">{{ message }}</p>

      <div class="confirm-action__actions">
        <button class="confirm-action__ghost" type="button" :disabled="busy" @click="emitCancel">
          {{ cancelLabel || '取消' }}
        </button>
        <button class="confirm-action__danger" type="button" :disabled="busy" @click="emitConfirm">
          {{ busy ? busyLabel : confirmLabel || '确认删除' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.confirm-action {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 1rem;
}

.confirm-action__backdrop {
  position: absolute;
  inset: 0;
  background: var(--color-overlay);
}

.confirm-action__panel {
  position: relative;
  z-index: 1;
  width: min(100%, 28rem);
  padding: 1.5rem;
}

.confirm-action__eyebrow,
.confirm-action__title,
.confirm-action__message {
  margin: 0;
}

.confirm-action__eyebrow {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-accent-strong);
}

.confirm-action__title {
  margin-top: 0.55rem;
  font-size: 1.4rem;
}

.confirm-action__message {
  margin-top: 0.8rem;
  color: var(--color-muted);
  line-height: 1.65;
}

.confirm-action__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.confirm-action__ghost,
.confirm-action__danger {
  min-height: 2.9rem;
  padding: 0.8rem 1rem;
  border-radius: 999px;
  font-weight: 700;
  cursor: pointer;
}

.confirm-action__ghost {
  border: 1px solid var(--color-border);
  background: transparent;
  color: var(--color-text);
}

.confirm-action__danger {
  border: 0;
  background: var(--color-danger);
  color: var(--color-on-surface-strong);
}

.confirm-action__ghost:disabled,
.confirm-action__danger:disabled {
  opacity: 0.55;
  cursor: wait;
}
</style>
