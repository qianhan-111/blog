<script setup lang="ts">
import { Moon, Sunny } from '@element-plus/icons-vue'
import { computed } from 'vue'

import { useThemeStore } from '@/stores/theme'

const themeStore = useThemeStore()

const nextThemeLabel = computed(() => (themeStore.theme === 'light' ? '深色' : '浅色'))
const nextThemeIcon = computed(() => (themeStore.theme === 'light' ? Moon : Sunny))
</script>

<template>
  <button
    class="theme-toggle"
    type="button"
    :aria-label="`切换到${nextThemeLabel}模式`"
    @click="themeStore.toggleTheme"
  >
    <span class="theme-toggle__indicator" aria-hidden="true">
      <component :is="nextThemeIcon" />
    </span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  padding: 0;
  border: 0;
  border-radius: var(--public-radius-compact, 8px);
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition:
    background-color 160ms ease,
    transform 160ms ease;
}

.theme-toggle:hover {
  background: var(--public-hover-background, color-mix(in srgb, var(--color-accent) 12%, transparent));
  transform: translateY(-1px);
}

.theme-toggle__indicator {
  display: grid;
  place-items: center;
  width: 1.4rem;
  height: 1.4rem;
}

.theme-toggle__indicator :deep(svg) {
  width: 1.05rem;
  height: 1.05rem;
}
</style>
