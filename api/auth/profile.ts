import { createApiHandler } from '../../src/server/handler.js'
import { assertMethod, readJsonBody } from '../../src/server/http.js'
import { authService } from '../../src/server/services/auth-service.js'
import { profileUpdateSchema } from '../../src/server/validators.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['GET', 'PUT'])

  const user = await authService.getCurrentUserFromRequest(request, 'author')

  if (request.method === 'GET') {
    return authService.getUserProfile(user)
  }

  return authService.updateUserProfile(user, profileUpdateSchema.parse(readJsonBody(request)))
})
