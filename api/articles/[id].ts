import { createApiHandler } from '../../src/server/handler.js'
import { assertMethod, readRouteId } from '../../src/server/http.js'
import { articleService } from '../../src/server/services/article-service.js'

export default createApiHandler((request) => {
  assertMethod(request, ['GET'])

  return articleService.getPublicArticleDetail(readRouteId(request, 'id', '/api/articles/'))
})
