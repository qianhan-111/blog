import { createApiHandler } from '../../../../src/server/handler.js'
import { assertMethod, readJsonBody, readRouteId } from '../../../../src/server/http.js'
import { authService } from '../../../../src/server/services/auth-service.js'
import { userService } from '../../../../src/server/services/user-service.js'
import { userStatusPayloadSchema } from '../../../../src/server/validators.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['PATCH'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')
  const id = readRouteId(request, 'id', '/api/admin/users/')
  const payload = userStatusPayloadSchema.parse(readJsonBody(request))

  return userService.updateUserStatus(user, id, payload.status)
})
