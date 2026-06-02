<script setup lang="ts">
defineProps<{
  active: boolean
}>()
</script>

<template>
  <div
    class="route-progress"
    :class="{ 'is-active': active }"
    data-test="route-progress"
    role="progressbar"
    aria-label="页面加载中"
    :aria-hidden="active ? 'false' : 'true'"
  >
    <span class="route-progress__bar" />
  </div>
</template>

<style scoped>
.route-progress {
  position: fixed;
  inset: 0 0 auto;
  z-index: 100;
  height: 3px;
  pointer-events: none;
  opacity: 0;
  transition: opacity 160ms ease;
}

.route-progress.is-active {
  opacity: 1;
}

.route-progress__bar {
  display: block;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-accent),
    color-mix(in srgb, var(--color-accent) 35%, white),
    transparent
  );
  transform-origin: left center;
  animation: route-progress-run 980ms cubic-bezier(0.72, 0, 0.28, 1) infinite;
}

@keyframes route-progress-run {
  0% {
    transform: translateX(-68%) scaleX(0.3);
  }

  55% {
    transform: translateX(8%) scaleX(0.7);
  }

  100% {
    transform: translateX(100%) scaleX(0.28);
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-progress,
  .route-progress__bar {
    transition: none;
    animation: none;
  }
}
</style>
