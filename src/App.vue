<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import RouteProgressIndicator from '@/components/common/RouteProgressIndicator.vue'
import RouteViewTransition from '@/components/common/RouteViewTransition.vue'

const router = useRouter()
const routeLoading = ref(true)
let loadingTimer: ReturnType<typeof setTimeout> | null = null

function startRouteLoading() {
  if (loadingTimer) {
    clearTimeout(loadingTimer)
  }

  routeLoading.value = true
}

function stopRouteLoading() {
  if (loadingTimer) {
    clearTimeout(loadingTimer)
  }

  loadingTimer = setTimeout(() => {
    routeLoading.value = false
  }, 180)
}

const removeBeforeEach = router.beforeEach(() => {
  startRouteLoading()
})

const removeAfterEach = router.afterEach(() => {
  stopRouteLoading()
})

const removeErrorHandler = router.onError(() => {
  stopRouteLoading()
})

onMounted(() => {
  void router.isReady().then(stopRouteLoading)
})

onBeforeUnmount(() => {
  removeBeforeEach()
  removeAfterEach()
  removeErrorHandler()

  if (loadingTimer) {
    clearTimeout(loadingTimer)
  }
})
</script>

<template>
  <RouteProgressIndicator :active="routeLoading" />
  <RouteViewTransition scope="layout" />
</template>
