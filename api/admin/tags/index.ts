import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod, readJsonBody } from '../../../src/server/http.js'
import { authService } from '../../../src/server/services/auth-service.js'
import { taxonomyService } from '../../../src/server/services/taxonomy-service.js'
import { tagPayloadSchema } from '../../../src/server/validators.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['POST'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')

  return taxonomyService.createTag(user, tagPayloadSchema.parse(readJsonBody(request)))
})
