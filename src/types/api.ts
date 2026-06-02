export interface ApiResponse<T> {
  code: number
  message: string
  data: T
}

export interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface PaginationResponse<T> {
  items: T[]
  meta: PaginationMeta
}

export type PaginatedResponse<T> = PaginationResponse<T>
