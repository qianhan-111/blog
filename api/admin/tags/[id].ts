import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod, readJsonBody, readRouteId } from '../../../src/server/http.js'
import { authService } from '../../../src/server/services/auth-service.js'
import { taxonomyService } from '../../../src/server/services/taxonomy-service.js'
import { tagPayloadSchema } from '../../../src/server/validators.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['PUT', 'DELETE'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')
  const id = readRouteId(request, 'id', '/api/admin/tags/')

  if (request.method === 'PUT') {
    return taxonomyService.updateTag(user, id, tagPayloadSchema.parse(readJsonBody(request)))
  }

  return taxonomyService.deleteTag(user, id)
})
