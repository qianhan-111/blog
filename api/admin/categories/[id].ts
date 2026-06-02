import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod, readJsonBody, readRouteId } from '../../../src/server/http.js'
import { authService } from '../../../src/server/services/auth-service.js'
import { taxonomyService } from '../../../src/server/services/taxonomy-service.js'
import { categoryPayloadSchema } from '../../../src/server/validators.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['PUT', 'DELETE'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')
  const id = readRouteId(request, 'id', '/api/admin/categories/')

  if (request.method === 'PUT') {
    return taxonomyService.updateCategory(user, id, categoryPayloadSchema.parse(readJsonBody(request)))
  }

  return taxonomyService.deleteCategory(user, id)
})
