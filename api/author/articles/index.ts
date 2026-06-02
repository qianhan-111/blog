import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod, readJsonBody } from '../../../src/server/http.js'
import { articleService } from '../../../src/server/services/article-service.js'
import { authService } from '../../../src/server/services/auth-service.js'
import { articlePayloadSchema, authorArticleListQuerySchema } from '../../../src/server/validators.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['GET', 'POST'])

  const user = await authService.getCurrentUserFromRequest(request, 'author')

  if (request.method === 'GET') {
    return articleService.listMyArticles(user, authorArticleListQuerySchema.parse(request.query))
  }

  return articleService.createMyArticle(user, articlePayloadSchema.parse(readJsonBody(request)))
})
