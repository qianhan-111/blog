import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod, readJsonBody, readRouteId } from '../../../src/server/http.js'
import { articleService } from '../../../src/server/services/article-service.js'
import { authService } from '../../../src/server/services/auth-service.js'
import { articlePayloadSchema } from '../../../src/server/validators.js'

export default createApiHandler(async (request) => {
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
})
