export interface VercelRequest {
  body?: unknown
  headers: {
    authorization?: string
    [key: string]: string | string[] | undefined
  }
  method?: string
  query: Record<string, string | string[] | undefined>
  url?: string
}

export interface VercelResponse {
  send(body: string): VercelResponse
  setHeader(key: string, value: string): VercelResponse
  status(statusCode: number): VercelResponse
}
