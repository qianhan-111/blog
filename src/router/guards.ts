import type { RouteLocationNormalized, RouteRecordRaw, Router } from 'vue-router'

import { ROUTE_NAMES, type RouteArea } from '@/constants/routes'
import { getAdminToken, getUserToken } from '@/utils/auth-storage'
import { canAccessRoleArea } from '@/utils/route-access'

const AREA_REDIRECTS: Record<Exclude<RouteArea, 'public'>, string> = {
  author: '/login',
  admin: '/admin/login',
}

const FORBIDDEN_QUERY_KEY = 'fromArea'
const REDIRECT_QUERY_KEY = 'redirect'

export interface DynamicRouteRegistry {
  author: RouteRecordRaw
  admin: RouteRecordRaw
}

function matchesRouteAreaPath(path: string, prefix: '/admin' | '/writer'): boolean {
  return path === prefix || path.startsWith(`${prefix}/`)
}

function canAccessProtectedArea(area: Exclude<RouteArea, 'public'>): boolean {
  if (area === 'author') {
    return canAccessRoleArea(getUserToken() ? 'author' : 'guest', area)
  }

  return canAccessRoleArea(getAdminToken() ? 'admin' : 'guest', area)
}

function hasAnySession(): boolean {
  return Boolean(getUserToken() || getAdminToken())
}

function inferRoleArea(to: RouteLocationNormalized): RouteArea {
  if (to.path === '/profile' || matchesRouteAreaPath(to.path, '/writer')) {
    return 'author'
  }

  if (to.path === '/admin/login') {
    return 'public'
  }

  if (matchesRouteAreaPath(to.path, '/admin')) {
    return 'admin'
  }

  const routeArea = to.matched
    .map((record) => record.meta.roleArea)
    .find((area): area is RouteArea => typeof area === 'string')

  if (routeArea) {
    return routeArea
  }

  return 'public'
}

function requiresAuth(to: RouteLocationNormalized, area: RouteArea): boolean {
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    return true
  }

  return area !== 'public'
}

function hasAreaRoutes(router: Router, area: Exclude<RouteArea, 'public'>): boolean {
  return router.hasRoute(area === 'author' ? ROUTE_NAMES.authorDashboard : ROUTE_NAMES.adminDashboard)
}

function buildLoginRedirect(area: Exclude<RouteArea, 'public'>, fullPath: string) {
  return {
    path: AREA_REDIRECTS[area],
    query: {
      [REDIRECT_QUERY_KEY]: fullPath,
    },
  }
}

export function registerRouteArea(
  router: Router,
  area: Exclude<RouteArea, 'public'>,
  routes: DynamicRouteRegistry,
): boolean {
  if (hasAreaRoutes(router, area)) {
    return false
  }

  router.addRoute(area === 'author' ? routes.author : routes.admin)
  return true
}

export function registerAccessibleRoutes(router: Router, routes: DynamicRouteRegistry): void {
  if (canAccessProtectedArea('author')) {
    registerRouteArea(router, 'author', routes)
  }

  if (canAccessProtectedArea('admin')) {
    registerRouteArea(router, 'admin', routes)
  }
}

export function installRouteGuards(router: Router, routes: DynamicRouteRegistry): void {
  router.beforeEach((to) => {
    const area = inferRoleArea(to)

    if (area !== 'public' && canAccessProtectedArea(area) && registerRouteArea(router, area, routes)) {
      return to.fullPath
    }

    if (!requiresAuth(to, area)) {
      return true
    }

    if (area === 'public' || canAccessProtectedArea(area)) {
      return true
    }

    if (hasAnySession()) {
      return {
        path: '/403',
        query: {
          [FORBIDDEN_QUERY_KEY]: area,
        },
      }
    }

    return buildLoginRedirect(area, to.fullPath)
  })
}
