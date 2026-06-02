import { createHttpClient } from '@/api/client'
import type { Category, CategoryPayload } from '@/types/category'

const publicClient = createHttpClient('public')
const adminClient = createHttpClient('admin')

export function getCategories() {
  return publicClient.get<Category[]>('/categories')
}

export function createCategory(payload: CategoryPayload) {
  return adminClient.post<Category, CategoryPayload>('/admin/categories', payload)
}

export function updateCategory(id: number, payload: CategoryPayload) {
  return adminClient.put<Category, CategoryPayload>(`/admin/categories/${id}`, payload)
}

export function deleteCategory(id: number) {
  return adminClient.delete<null>(`/admin/categories/${id}`)
}
