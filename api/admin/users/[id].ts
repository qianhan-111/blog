import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod, readRouteId } from '../../../src/server/http.js'
import { authService } from '../../../src/server/services/auth-service.js'
import { userService } from '../../../src/server/services/user-service.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['GET', 'DELETE'])

  const user = await authService.getCurrentUserFromRequest(request, 'admin')
  const id = readRouteId(request, 'id', '/api/admin/users/')

  if (request.method === 'GET') {
    return userService.getUserDetail(user, id)
  }

  return userService.deleteUser(user, id)
})
