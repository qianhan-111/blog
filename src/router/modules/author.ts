import type { RouteRecordRaw } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'

const AuthorArticleEditorView = () => import('@/views/author/AuthorArticleEditorView.vue')
const AuthorLayout = () => import('@/layouts/AuthorLayout.vue')
const AuthorArticlesView = () => import('@/views/author/AuthorArticlesView.vue')
const AuthorDashboardView = () => import('@/views/author/AuthorDashboardView.vue')
const NotFoundView = () => import('@/views/error/NotFoundView.vue')

export const authorRoutes: RouteRecordRaw = {
  path: '/writer',
  component: AuthorLayout,
  meta: {
    requiresAuth: true,
    roleArea: 'author',
  },
  children: [
    {
      path: '',
      name: ROUTE_NAMES.authorDashboard,
      component: AuthorDashboardView,
      meta: {
        requiresAuth: true,
        roleArea: 'author',
      },
    },
    {
      path: 'articles',
      name: ROUTE_NAMES.authorArticles,
      component: AuthorArticlesView,
      meta: {
        requiresAuth: true,
        roleArea: 'author',
      },
    },
    {
      path: 'articles/new',
      name: ROUTE_NAMES.authorArticleCreate,
      component: AuthorArticleEditorView,
      meta: {
        requiresAuth: true,
        roleArea: 'author',
      },
    },
    {
      path: 'articles/:id/edit',
      name: ROUTE_NAMES.authorArticleEdit,
      component: AuthorArticleEditorView,
      meta: {
        requiresAuth: true,
        roleArea: 'author',
      },
    },
    {
      path: ':pathMatch(.*)*',
      component: NotFoundView,
      meta: {
        requiresAuth: true,
        roleArea: 'author',
      },
    },
  ],
}
