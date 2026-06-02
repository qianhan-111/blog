import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod } from '../../../src/server/http.js'
import { authService } from '../../../src/server/services/auth-service.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['GET'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')

  return authService.getAdminProfile(user)
})
