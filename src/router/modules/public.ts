import type { RouteRecordRaw } from 'vue-router'

import { ROUTE_NAMES } from '@/constants/routes'

const PublicLayout = () => import('@/layouts/PublicLayout.vue')
const LoginView = () => import('@/views/auth/LoginView.vue')
const RegisterView = () => import('@/views/auth/RegisterView.vue')
const ForbiddenView = () => import('@/views/error/ForbiddenView.vue')
const ArticleDetailView = () => import('@/views/public/ArticleDetailView.vue')
const AuthorProfileView = () => import('@/views/public/AuthorProfileView.vue')
const HomeView = () => import('@/views/public/HomeView.vue')
const ProfileView = () => import('@/views/profile/ProfileView.vue')

export const publicRoutes: RouteRecordRaw = {
  path: '/',
  component: PublicLayout,
  children: [
    {
      path: '',
      name: ROUTE_NAMES.home,
      alias: 'articles',
      component: HomeView,
    },
    {
      path: 'login',
      name: ROUTE_NAMES.login,
      component: LoginView,
      meta: {
        authScreen: true,
      },
    },
    {
      path: 'articles/:id',
      name: ROUTE_NAMES.articleDetail,
      component: ArticleDetailView,
    },
    {
      path: 'authors/:id',
      name: ROUTE_NAMES.authorProfile,
      component: AuthorProfileView,
    },
    {
      path: 'register',
      name: ROUTE_NAMES.register,
      component: RegisterView,
      meta: {
        authScreen: true,
      },
    },
    {
      path: 'profile',
      name: ROUTE_NAMES.profile,
      component: ProfileView,
    },
    {
      path: '403',
      name: ROUTE_NAMES.forbidden,
      component: ForbiddenView,
    },
  ],
}
