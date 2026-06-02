<script setup lang="ts">
import { RouterLink } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'

defineProps<{
  eyebrow: string
  title: string
  description: string
}>()
</script>

<template>
  <section class="auth-card-shell">
    <div class="auth-card-shell__backdrop" aria-hidden="true" />
    <div class="auth-card-shell__card surface-card">
      <RouterLink class="auth-card-shell__home" :to="{ name: ROUTE_NAMES.home }">返回首页</RouterLink>

      <div class="auth-card-shell__hero">
        <p class="auth-card-shell__eyebrow">{{ eyebrow }}</p>
        <h1 class="auth-card-shell__title">{{ title }}</h1>
        <p class="auth-card-shell__description">{{ description }}</p>
      </div>

      <div class="auth-card-shell__body">
        <slot />
      </div>
    </div>
  </section>
</template>

<style scoped>
.auth-card-shell {
  position: relative;
  display: grid;
  place-items: center;
  min-height: var(--auth-card-shell-min-height, 100svh);
  padding: clamp(0.5rem, 1.5vh, 1rem) 1rem;
  background:
    radial-gradient(circle at 10% 8%, rgba(180, 83, 9, 0.26), transparent 34%),
    radial-gradient(circle at 86% 86%, rgba(23, 32, 51, 0.22), transparent 32%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.42), rgba(255, 255, 255, 0.08)),
    var(--public-page-background);
  overflow: hidden;
}

.auth-card-shell__backdrop {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px),
    linear-gradient(180deg, rgba(15, 23, 42, 0.05) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(135deg, rgba(0, 0, 0, 0.45), transparent 72%);
  pointer-events: none;
}

:global(:root[data-theme='dark']) .auth-card-shell {
  background:
    radial-gradient(circle at 12% 8%, rgba(245, 158, 11, 0.16), transparent 34%),
    radial-gradient(circle at 86% 86%, rgba(148, 163, 184, 0.14), transparent 32%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.2), rgba(2, 6, 23, 0.42)),
    var(--public-page-background);
}

:global(:root[data-theme='dark']) .auth-card-shell__backdrop {
  background:
    linear-gradient(90deg, rgba(203, 213, 225, 0.05) 1px, transparent 1px),
    linear-gradient(180deg, rgba(203, 213, 225, 0.05) 1px, transparent 1px);
}

.auth-card-shell__card {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  width: min(100%, 940px);
  max-height: calc(var(--auth-card-shell-max-height, 100svh) - clamp(1rem, 3vh, 2rem));
  overflow: hidden;
  border-radius: 1.5rem;
  backdrop-filter: blur(18px);
}

.auth-card-shell__home {
  position: absolute;
  inset: 0.9rem 0.9rem auto auto;
  z-index: 2;
  padding: 0.38rem 0.72rem;
  border: 1px solid rgba(248, 250, 252, 0.24);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.24);
  color: var(--color-on-surface-strong);
  font-size: 0.86rem;
  font-weight: 700;
  text-decoration: none;
  backdrop-filter: blur(8px);
}

.auth-card-shell__hero {
  display: grid;
  gap: clamp(0.65rem, 1.8vh, 1rem);
  padding: clamp(1.5rem, 3vw, 2.6rem);
  background:
    linear-gradient(155deg, rgba(23, 32, 51, 0.96), rgba(72, 35, 10, 0.9)),
    var(--color-surface-strong);
  color: var(--color-on-surface-strong);
}

.auth-card-shell__eyebrow,
.auth-card-shell__title,
.auth-card-shell__description {
  margin: 0;
}

.auth-card-shell__eyebrow {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(248, 250, 252, 0.76);
}

.auth-card-shell__title {
  font-size: clamp(2.2rem, 4vw, 3.5rem);
  line-height: 1;
}

.auth-card-shell__description {
  max-width: 36ch;
  color: rgba(248, 250, 252, 0.82);
  line-height: 1.7;
}

.auth-card-shell__body {
  padding: clamp(1.15rem, 2.5vw, 2rem);
}

@media (max-width: 900px) {
  .auth-card-shell__card {
    grid-template-columns: 1fr;
    width: min(100%, 32rem);
    overflow: auto;
  }

  .auth-card-shell__home {
    border-color: var(--color-border);
    background: var(--color-surface-soft);
    color: var(--color-text);
  }
}

@media (max-height: 740px) {
  .auth-card-shell__title {
    font-size: clamp(1.85rem, 3.5vw, 2.7rem);
  }

  .auth-card-shell__description {
    line-height: 1.5;
  }
}

@media (max-height: 680px) and (max-width: 900px) {
  .auth-card-shell__hero {
    display: none;
  }
}
</style>
