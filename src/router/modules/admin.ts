import type { RouteRecordRaw } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'

const AdminLayout = () => import('@/layouts/AdminLayout.vue')
const AdminArticlesView = () => import('@/views/admin/AdminArticlesView.vue')
const AdminCategoriesView = () => import('@/views/admin/AdminCategoriesView.vue')
const AdminLoginView = () => import('@/views/admin/AdminLoginView.vue')
const AdminDashboardView = () => import('@/views/admin/AdminDashboardView.vue')
const AdminTagsView = () => import('@/views/admin/AdminTagsView.vue')
const AdminUsersView = () => import('@/views/admin/AdminUsersView.vue')
const NotFoundView = () => import('@/views/error/NotFoundView.vue')

export const adminPublicRoutes: RouteRecordRaw[] = [
  {
    path: '/admin/login',
    name: ROUTE_NAMES.adminLogin,
    component: AdminLoginView,
    meta: {
      requiresAuth: false,
      roleArea: 'public',
    },
  },
]

export const adminRoutes: RouteRecordRaw = {
  path: '/admin',
  component: AdminLayout,
  meta: {
    requiresAuth: true,
    roleArea: 'admin',
  },
  children: [
    {
      path: '',
      name: ROUTE_NAMES.adminDashboard,
      component: AdminDashboardView,
      meta: {
        requiresAuth: true,
        roleArea: 'admin',
      },
    },
    {
      path: 'articles',
      name: ROUTE_NAMES.adminArticles,
      component: AdminArticlesView,
      meta: {
        requiresAuth: true,
        roleArea: 'admin',
      },
    },
    {
      path: 'categories',
      name: ROUTE_NAMES.adminCategories,
      component: AdminCategoriesView,
      meta: {
        requiresAuth: true,
        roleArea: 'admin',
      },
    },
    {
      path: 'tags',
      name: ROUTE_NAMES.adminTags,
      component: AdminTagsView,
      meta: {
        requiresAuth: true,
        roleArea: 'admin',
      },
    },
    {
      path: 'users',
      name: ROUTE_NAMES.adminUsers,
      component: AdminUsersView,
      meta: {
        requiresAuth: true,
        roleArea: 'admin',
      },
    },
    {
      path: ':pathMatch(.*)*',
      component: NotFoundView,
      meta: {
        requiresAuth: true,
        roleArea: 'admin',
      },
    },
  ],
}
