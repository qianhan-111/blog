import { ApiError } from './errors.js'
import { assertMethod, readJsonBody, readRouteId } from './http.js'
import { findPublicAuthorById } from './repositories/users.js'
import { articleService } from './services/article-service.js'
import { authService } from './services/auth-service.js'
import { taxonomyService } from './services/taxonomy-service.js'
import { userService } from './services/user-service.js'
import type { VercelRequest } from './vercel-types.js'
import {
  articlePayloadSchema,
  categoryPayloadSchema,
  loginPayloadSchema,
  parseAdminArticleListQuery,
  parseAdminUserListQuery,
  parseArticleListQuery,
  parseAuthorArticleListQuery,
  profileUpdateSchema,
  registerPayloadSchema,
  tagPayloadSchema,
  userStatusPayloadSchema,
} from './validators.js'

function getApiSegments(request: VercelRequest): string[] {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  const normalizedPathname = pathname.replace(/\/+$/, '') || '/'

  if (normalizedPathname === '/api') {
    return []
  }

  if (!normalizedPathname.startsWith('/api/')) {
    throw new ApiError(404, 'API endpoint not found')
  }

  return normalizedPathname.slice('/api/'.length).split('/')
}

function removeVercelRouteQuery(request: VercelRequest): VercelRequest {
  if (!('path' in request.query)) {
    return request
  }

  const query = { ...request.query }
  delete query.path

  return {
    ...request,
    query,
  }
}

async function handlePublicAuthorProfile(request: VercelRequest) {
  assertMethod(request, ['GET'])

  const author = await findPublicAuthorById(readRouteId(request, 'id', '/api/authors/'))

  if (!author) {
    throw new ApiError(404, 'Author not found')
  }

  return author
}

async function handleAuthorProfile(request: VercelRequest) {
  assertMethod(request, ['GET', 'PUT'])

  const user = await authService.getCurrentUserFromRequest(request, 'author')

  if (request.method === 'GET') {
    return authService.getUserProfile(user)
  }

  return authService.updateUserProfile(user, profileUpdateSchema.parse(readJsonBody(request)))
}

async function handleAuthorArticles(request: VercelRequest) {
  assertMethod(request, ['GET', 'POST'])

  const user = await authService.getCurrentUserFromRequest(request, 'author')

  if (request.method === 'GET') {
    return articleService.listMyArticles(user, parseAuthorArticleListQuery(request.query))
  }

  return articleService.createMyArticle(user, articlePayloadSchema.parse(readJsonBody(request)))
}

async function handleAuthorArticleDetail(request: VercelRequest) {
  assertMethod(request, ['GET', 'PUT', 'DELETE'])

  const user = await authService.getCurrentUserFromRequest(request, 'author')
  const id = readRouteId(request, 'id', '/api/author/articles/')

  if (request.method === 'GET') {
    return articleService.getMyArticleDetail(user, id)
  }

  if (request.method === 'PUT') {
    return articleService.updateMyArticle(user, id, articlePayloadSchema.parse(readJsonBody(request)))
  }

  return articleService.deleteMyArticle(user, id)
}

async function handleAdminProfile(request: VercelRequest) {
  assertMethod(request, ['GET'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')

  return authService.getAdminProfile(user)
}

async function handleAdminArticles(request: VercelRequest) {
  assertMethod(request, ['GET'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')

  return articleService.listAdminArticles(user, parseAdminArticleListQuery(request.query))
}

async function handleAdminArticleDetail(request: VercelRequest) {
  assertMethod(request, ['GET', 'PUT', 'DELETE'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')
  const id = readRouteId(request, 'id', '/api/admin/articles/')

  if (request.method === 'GET') {
    return articleService.getAdminArticleDetail(user, id)
  }

  if (request.method === 'PUT') {
    return articleService.updateAdminArticle(user, id, articlePayloadSchema.parse(readJsonBody(request)))
  }

  return articleService.deleteAdminArticle(user, id)
}

async function handleAdminCategoryCreate(request: VercelRequest) {
  assertMethod(request, ['POST'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')

  return taxonomyService.createCategory(user, categoryPayloadSchema.parse(readJsonBody(request)))
}

async function handleAdminCategoryDetail(request: VercelRequest) {
  assertMethod(request, ['PUT', 'DELETE'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')
  const id = readRouteId(request, 'id', '/api/admin/categories/')

  if (request.method === 'PUT') {
    return taxonomyService.updateCategory(user, id, categoryPayloadSchema.parse(readJsonBody(request)))
  }

  return taxonomyService.deleteCategory(user, id)
}

async function handleAdminTagCreate(request: VercelRequest) {
  assertMethod(request, ['POST'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')

  return taxonomyService.createTag(user, tagPayloadSchema.parse(readJsonBody(request)))
}

async function handleAdminTagDetail(request: VercelRequest) {
  assertMethod(request, ['PUT', 'DELETE'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')
  const id = readRouteId(request, 'id', '/api/admin/tags/')

  if (request.method === 'PUT') {
    return taxonomyService.updateTag(user, id, tagPayloadSchema.parse(readJsonBody(request)))
  }

  return taxonomyService.deleteTag(user, id)
}

async function handleAdminUsers(request: VercelRequest) {
  assertMethod(request, ['GET'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')

  return userService.listUsers(user, parseAdminUserListQuery(request.query))
}

async function handleAdminUserDetail(request: VercelRequest) {
  assertMethod(request, ['GET', 'DELETE'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')
  const id = readRouteId(request, 'id', '/api/admin/users/')

  if (request.method === 'GET') {
    return userService.getUserDetail(user, id)
  }

  return userService.deleteUser(user, id)
}

async function handleAdminUserStatus(request: VercelRequest) {
  assertMethod(request, ['PATCH'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')
  const id = readRouteId(request, 'id', '/api/admin/users/')
  const payload = userStatusPayloadSchema.parse(readJsonBody(request))

  return userService.updateUserStatus(user, id, payload.status)
}

export async function routeApiRequest(request: VercelRequest) {
  const cleanRequest = removeVercelRouteQuery(request)
  const segments = getApiSegments(cleanRequest)

  if (segments.length === 1 && segments[0] === 'health') {
    assertMethod(cleanRequest, ['GET'])
    return { status: 'ok' }
  }

  if (segments.length === 1 && segments[0] === 'categories') {
    assertMethod(cleanRequest, ['GET'])
    return taxonomyService.listCategories()
  }

  if (segments.length === 1 && segments[0] === 'tags') {
    assertMethod(cleanRequest, ['GET'])
    return taxonomyService.listTags()
  }

  if (segments.length === 1 && segments[0] === 'articles') {
    assertMethod(cleanRequest, ['GET'])
    return articleService.listPublicArticles(parseArticleListQuery(cleanRequest.query))
  }

  if (segments.length === 2 && segments[0] === 'articles') {
    assertMethod(cleanRequest, ['GET'])
    return articleService.getPublicArticleDetail(readRouteId(cleanRequest, 'id', '/api/articles/'))
  }

  if (segments.length === 3 && segments[0] === 'articles' && segments[2] === 'prev-next') {
    assertMethod(cleanRequest, ['GET'])
    return articleService.getArticlePrevNext(readRouteId(cleanRequest, 'id', '/api/articles/'))
  }

  if (segments.length === 2 && segments[0] === 'authors') {
    return handlePublicAuthorProfile(cleanRequest)
  }

  if (segments.length === 3 && segments[0] === 'authors' && segments[2] === 'articles') {
    assertMethod(cleanRequest, ['GET'])
    return articleService.listAuthorPublishedArticles(
      readRouteId(cleanRequest, 'id', '/api/authors/'),
      parseArticleListQuery(cleanRequest.query),
    )
  }

  if (segments.length === 2 && segments[0] === 'auth' && segments[1] === 'register') {
    assertMethod(cleanRequest, ['POST'])
    return authService.registerAuthor(registerPayloadSchema.parse(readJsonBody(cleanRequest)))
  }

  if (segments.length === 2 && segments[0] === 'auth' && segments[1] === 'login') {
    assertMethod(cleanRequest, ['POST'])
    return authService.login(loginPayloadSchema.parse(readJsonBody(cleanRequest)), 'author')
  }

  if (segments.length === 2 && segments[0] === 'auth' && segments[1] === 'logout') {
    assertMethod(cleanRequest, ['POST'])
    return authService.logout()
  }

  if (segments.length === 2 && segments[0] === 'auth' && segments[1] === 'profile') {
    return handleAuthorProfile(cleanRequest)
  }

  if (segments.length === 3 && segments[0] === 'admin' && segments[1] === 'auth' && segments[2] === 'login') {
    assertMethod(cleanRequest, ['POST'])
    return authService.login(loginPayloadSchema.parse(readJsonBody(cleanRequest)), 'admin')
  }

  if (segments.length === 3 && segments[0] === 'admin' && segments[1] === 'auth' && segments[2] === 'logout') {
    assertMethod(cleanRequest, ['POST'])
    return authService.logout()
  }

  if (segments.length === 3 && segments[0] === 'admin' && segments[1] === 'auth' && segments[2] === 'profile') {
    return handleAdminProfile(cleanRequest)
  }

  if (segments.length === 2 && segments[0] === 'author' && segments[1] === 'articles') {
    return handleAuthorArticles(cleanRequest)
  }

  if (segments.length === 3 && segments[0] === 'author' && segments[1] === 'articles') {
    return handleAuthorArticleDetail(cleanRequest)
  }

  if (segments.length === 2 && segments[0] === 'admin' && segments[1] === 'articles') {
    return handleAdminArticles(cleanRequest)
  }

  if (segments.length === 3 && segments[0] === 'admin' && segments[1] === 'articles') {
    return handleAdminArticleDetail(cleanRequest)
  }

  if (segments.length === 2 && segments[0] === 'admin' && segments[1] === 'categories') {
    return handleAdminCategoryCreate(cleanRequest)
  }

  if (segments.length === 3 && segments[0] === 'admin' && segments[1] === 'categories') {
    return handleAdminCategoryDetail(cleanRequest)
  }

  if (segments.length === 2 && segments[0] === 'admin' && segments[1] === 'tags') {
    return handleAdminTagCreate(cleanRequest)
  }

  if (segments.length === 3 && segments[0] === 'admin' && segments[1] === 'tags') {
    return handleAdminTagDetail(cleanRequest)
  }

  if (segments.length === 2 && segments[0] === 'admin' && segments[1] === 'users') {
    return handleAdminUsers(cleanRequest)
  }

  if (segments.length === 3 && segments[0] === 'admin' && segments[1] === 'users') {
    return handleAdminUserDetail(cleanRequest)
  }

  if (segments.length === 4 && segments[0] === 'admin' && segments[1] === 'users' && segments[3] === 'status') {
    return handleAdminUserStatus(cleanRequest)
  }

  throw new ApiError(404, 'API endpoint not found')
}
