import { createApiHandler } from '../../../src/server/handler.js'
import { assertMethod, readJsonBody } from '../../../src/server/http.js'
import { authService } from '../../../src/server/services/auth-service.js'
import { loginPayloadSchema } from '../../../src/server/validators.js'

export default createApiHandler((request) => {
  assertMethod(request, ['POST'])

  return authService.login(loginPayloadSchema.parse(readJsonBody(request)), 'admin')
})
