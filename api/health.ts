import { createApiHandler } from '../src/server/handler.js'
import { assertMethod } from '../src/server/http.js'

export default createApiHandler((request) => {
  assertMethod(request, ['GET'])

  return {
    status: 'ok',
  }
})
