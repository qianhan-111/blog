import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod } from '../../../src/server/http.js'
import { articleService } from '../../../src/server/services/article-service.js'
import { authService } from '../../../src/server/services/auth-service.js'
import { adminArticleListQuerySchema } from '../../../src/server/validators.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['GET'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')

  return articleService.listAdminArticles(user, adminArticleListQuerySchema.parse(request.query))
})
