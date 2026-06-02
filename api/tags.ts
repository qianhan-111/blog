import { createApiHandler } from '../src/server/handler.js'
import { assertMethod } from '../src/server/http.js'
import { taxonomyService } from '../src/server/services/taxonomy-service.js'

export default createApiHandler((request) => {
  assertMethod(request, ['GET'])

  return taxonomyService.listTags()
})
