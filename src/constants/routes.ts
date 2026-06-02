import type { AuthRole } from '@/types/auth'

export type RouteArea = 'public' | 'author' | 'admin'

export type RouteName =
  | 'home'
  | 'article-detail'
  | 'author-profile'
  | 'login'
  | 'register'
  | 'profile'
  | 'forbidden'
  | 'not-found'
  | 'author-dashboard'
  | 'author-articles'
  | 'author-article-create'
  | 'author-article-edit'
  | 'admin-login'
  | 'admin-dashboard'
  | 'admin-articles'
  | 'admin-categories'
  | 'admin-tags'
  | 'admin-users'

export const ROUTE_AREAS = ['public', 'author', 'admin'] as const satisfies readonly RouteArea[]

export const ROUTE_NAMES = {
  home: 'home',
  articleDetail: 'article-detail',
  authorProfile: 'author-profile',
  login: 'login',
  register: 'register',
  profile: 'profile',
  forbidden: 'forbidden',
  notFound: 'not-found',
  authorDashboard: 'author-dashboard',
  authorArticles: 'author-articles',
  authorArticleCreate: 'author-article-create',
  authorArticleEdit: 'author-article-edit',
  adminLogin: 'admin-login',
  adminDashboard: 'admin-dashboard',
  adminArticles: 'admin-articles',
  adminCategories: 'admin-categories',
  adminTags: 'admin-tags',
  adminUsers: 'admin-users',
} as const satisfies Record<string, RouteName>

export const DEFAULT_ROUTE_BY_AREA: Record<RouteArea, RouteName> = {
  public: ROUTE_NAMES.home,
  author: ROUTE_NAMES.authorDashboard,
  admin: ROUTE_NAMES.adminDashboard,
}

export const ALLOWED_ROUTE_AREAS_BY_ROLE: Record<AuthRole, readonly RouteArea[]> = {
  guest: ['public'],
  author: ['public', 'author'],
  admin: ['public', 'admin'],
}
