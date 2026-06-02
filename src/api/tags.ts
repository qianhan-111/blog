import { createHttpClient } from '@/api/client'
import type { Tag, TagPayload } from '@/types/tag'

const publicClient = createHttpClient('public')
const adminClient = createHttpClient('admin')

export function getTags() {
  return publicClient.get<Tag[]>('/tags')
}

export function createTag(payload: TagPayload) {
  return adminClient.post<Tag, TagPayload>('/admin/tags', payload)
}

export function updateTag(id: number, payload: TagPayload) {
  return adminClient.put<Tag, TagPayload>(`/admin/tags/${id}`, payload)
}

export function deleteTag(id: number) {
  return adminClient.delete<null>(`/admin/tags/${id}`)
}
