import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod } from '../../../src/server/http.js'
import { authService } from '../../../src/server/services/auth-service.js'
import { userService } from '../../../src/server/services/user-service.js'
import { adminUserListQuerySchema } from '../../../src/server/validators.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['GET'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')

  return userService.listUsers(user, adminUserListQuerySchema.parse(request.query))
})
