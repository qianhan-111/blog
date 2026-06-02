export class ApiError extends Error {
  status: number
  code: number

  constructor(status: number, message: string, code = status) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}
