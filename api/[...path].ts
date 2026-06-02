import { routeApiRequest } from '../src/server/api-router.js'
import { createApiHandler } from '../src/server/handler.js'

export default createApiHandler(routeApiRequest)
