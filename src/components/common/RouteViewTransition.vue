<script setup lang="ts">
import { RouterView, type RouteLocationNormalizedLoaded } from 'vue-router'

const props = withDefaults(
  defineProps<{
    scope?: 'layout' | 'page'
  }>(),
  {
    scope: 'page',
  },
)

function getRouteKey(route: RouteLocationNormalizedLoaded) {
  if (props.scope === 'layout') {
    return route.matched[0]?.path || route.path
  }

  return route.path
}
</script>

<template>
  <div class="route-view-transition" data-test="route-transition">
    <RouterView v-slot="{ Component, route }">
      <Transition name="route-view" mode="out-in" appear>
        <Suspense>
          <template #default>
            <div :key="getRouteKey(route)" class="route-view-transition__frame">
              <component :is="Component" />
            </div>
          </template>

          <template #fallback>
            <div class="route-view-transition__fallback" role="status" aria-label="页面加载中">
              <span class="route-view-transition__pulse" aria-hidden="true" />
            </div>
          </template>
        </Suspense>
      </Transition>
    </RouterView>
  </div>
</template>

<style scoped>
.route-view-transition {
  min-width: 0;
  overflow: hidden;
  overflow: clip;
  overflow-clip-margin: 14px;
}

.route-view-transition__frame {
  min-width: 0;
  overflow: hidden;
  overflow: clip;
  overflow-clip-margin: 14px;
}

.route-view-transition__fallback {
  display: grid;
  place-items: center;
  min-height: 10rem;
}

.route-view-transition__pulse {
  width: 2.35rem;
  height: 2.35rem;
  border: 2px solid var(--public-feed-divider, var(--color-border));
  border-top-color: var(--color-accent);
  border-radius: 999px;
  animation: route-view-spin 820ms linear infinite;
}

:global(.route-view-enter-active),
:global(.route-view-leave-active) {
  transition:
    opacity 180ms ease,
    filter 180ms ease;
}

:global(.route-view-enter-from) {
  opacity: 0;
  filter: blur(3px);
}

:global(.route-view-leave-to) {
  opacity: 0;
  filter: blur(2px);
}

@keyframes route-view-spin {
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .route-view-transition__pulse,
  :global(.route-view-enter-active),
  :global(.route-view-leave-active) {
    transition: none;
    animation: none;
  }

  :global(.route-view-enter-from),
  :global(.route-view-leave-to) {
    filter: none;
  }
}
</style>
