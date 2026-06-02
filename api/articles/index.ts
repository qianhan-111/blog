import { createApiHandler } from '../../src/server/handler.js'
import { assertMethod } from '../../src/server/http.js'
import { articleService } from '../../src/server/services/article-service.js'
import { parseArticleListQuery } from '../../src/server/validators.js'

export default createApiHandler((request) => {
  assertMethod(request, ['GET'])

  return articleService.listPublicArticles(parseArticleListQuery(request.query))
})
