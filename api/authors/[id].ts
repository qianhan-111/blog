import { ApiError } from '../../src/server/errors.js'
import { createApiHandler } from '../../src/server/handler.js'
import { assertMethod, readRouteId } from '../../src/server/http.js'
import { findPublicAuthorById } from '../../src/server/repositories/users.js'

export default createApiHandler(async (request) => {
  assertMethod(request, ['GET'])

  const author = await findPublicAuthorById(readRouteId(request, 'id', '/api/authors/'))

  if (!author) {
    throw new ApiError(404, '作者不存在')
  }

  return author
})
