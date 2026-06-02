import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod, readRouteId } from '../../../src/server/http.js'
import { articleService } from '../../../src/server/services/article-service.js'
import { articleListQuerySchema } from '../../../src/server/validators.js'

export default createApiHandler((request) => {
  assertMethod(request, ['GET'])

  return articleService.listAuthorPublishedArticles(
    readRouteId(request, 'id', '/api/authors/'),
    articleListQuerySchema.parse(request.query),
  )
})
