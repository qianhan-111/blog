import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod } from '../../../src/server/http.js'
import { authService } from '../../../src/server/services/auth-service.js'

export default createApiHandler((request) => {
  assertMethod(request, ['POST'])

  return authService.logout()
})
