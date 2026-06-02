import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw, RouterHistory } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'
import { installRouteGuards, registerAccessibleRoutes } from '@/router/guards'
import { adminPublicRoutes, adminRoutes } from '@/router/modules/admin'
import { authorRoutes } from '@/router/modules/author'
import { publicRoutes } from '@/router/modules/public'

const NotFoundView = () => import('@/views/error/NotFoundView.vue')

function createPublicRoutes(): RouteRecordRaw {
  const children = (publicRoutes.children ?? []).map((route) => {
    const isProfileRoute = route.name === ROUTE_NAMES.profile

    return {
      ...route,
      meta: {
        ...route.meta,
        requiresAuth: isProfileRoute,
        roleArea: isProfileRoute ? 'author' : 'public',
      },
    } as RouteRecordRaw
  })

  return {
    ...publicRoutes,
    meta: {
      ...publicRoutes.meta,
      requiresAuth: false,
      roleArea: 'public',
    },
    children,
  } as RouteRecordRaw
}

function createBaseRoutes(): RouteRecordRaw[] {
  return [
    createPublicRoutes(),
    ...adminPublicRoutes,
    {
      path: '/:pathMatch(.*)*',
      name: ROUTE_NAMES.notFound,
      component: NotFoundView,
      meta: {
        requiresAuth: false,
        roleArea: 'public',
      },
    },
  ]
}

export function createAppRouter(history: RouterHistory = createWebHistory(import.meta.env.BASE_URL)) {
  const router = createRouter({
    history,
    routes: createBaseRoutes(),
  })

  const dynamicRoutes = {
    author: authorRoutes,
    admin: adminRoutes,
  }

  const syncAccessibleRoutes = () => {
    registerAccessibleRoutes(router, dynamicRoutes)
  }

  const originalPush = router.push.bind(router)
  router.push = ((to) => {
    syncAccessibleRoutes()
    return originalPush(to)
  }) as typeof router.push

  const originalReplace = router.replace.bind(router)
  router.replace = ((to) => {
    syncAccessibleRoutes()
    return originalReplace(to)
  }) as typeof router.replace

  syncAccessibleRoutes()
  installRouteGuards(router, dynamicRoutes)

  return router
}

const router = createAppRouter()

export default router
