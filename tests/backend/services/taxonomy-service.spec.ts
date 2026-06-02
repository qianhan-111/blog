// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import { createTaxonomyService, type TaxonomyRepository } from '../../../src/server/services/taxonomy-service'
import type { Category, CurrentUser, Tag } from '../../../src/server/types'

const admin: CurrentUser = {
  userId: 1,
  role: 'admin',
  username: 'admin',
  email: 'admin@example.com',
  nickname: 'Admin',
  status: 'enabled',
}

const category: Category = {
  id: 1,
  name: 'Vue 3',
  description: 'Vue articles',
  createdAt: '2026-05-17T00:00:00.000Z',
}

const tag: Tag = {
  id: 1,
  name: 'Vite',
  createdAt: '2026-05-17T00:00:00.000Z',
}

function createRepository(overrides: Partial<TaxonomyRepository> = {}): TaxonomyRepository {
  return {
    createCategory: vi.fn(async () => category),
    createTag: vi.fn(async () => tag),
    deleteCategory: vi.fn(async () => true),
    deleteTag: vi.fn(async () => true),
    isCategoryReferenced: vi.fn(async () => false),
    isTagReferenced: vi.fn(async () => false),
    listCategories: vi.fn(async () => [category]),
    listTags: vi.fn(async () => [tag]),
    updateCategory: vi.fn(async () => category),
    updateTag: vi.fn(async () => tag),
    ...overrides,
  }
}

describe('taxonomy service rules', () => {
  it('allows admins to create categories and tags', async () => {
    const repository = createRepository()
    const service = createTaxonomyService(repository)

    await service.createCategory(admin, { name: 'Vue 3', description: 'Vue articles' })
    await service.createTag(admin, { name: 'Vite' })

    expect(repository.createCategory).toHaveBeenCalledWith({
      name: 'Vue 3',
      description: 'Vue articles',
    })
    expect(repository.createTag).toHaveBeenCalledWith({ name: 'Vite' })
  })

  it('blocks deleting referenced categories', async () => {
    const repository = createRepository({
      isCategoryReferenced: vi.fn(async () => true),
    })
    const service = createTaxonomyService(repository)

    await expect(service.deleteCategory(admin, 1)).rejects.toMatchObject({
      status: 409,
      message: '分类已被文章引用，不能删除',
    })
    expect(repository.deleteCategory).not.toHaveBeenCalled()
  })

  it('returns not found when deleting a missing category', async () => {
    const repository = createRepository({
      deleteCategory: vi.fn(async () => false),
    })
    const service = createTaxonomyService(repository)

    await expect(service.deleteCategory(admin, 404)).rejects.toMatchObject({
      status: 404,
      message: '分类不存在',
    })
  })

  it('maps category delete foreign key races to referenced conflicts', async () => {
    const repository = createRepository({
      isCategoryReferenced: vi.fn(async () => false),
      deleteCategory: vi.fn(async () => {
        throw Object.assign(new Error('update or delete on table violates foreign key constraint'), {
          code: '23503',
        })
      }),
    })
    const service = createTaxonomyService(repository)

    await expect(service.deleteCategory(admin, 1)).rejects.toMatchObject({
      status: 409,
      message: '分类已被文章引用，不能删除',
    })
  })

  it('blocks deleting referenced tags', async () => {
    const repository = createRepository({
      isTagReferenced: vi.fn(async () => true),
    })
    const service = createTaxonomyService(repository)

    await expect(service.deleteTag(admin, 1)).rejects.toMatchObject({
      status: 409,
      message: '标签已被文章引用，不能删除',
    })
    expect(repository.deleteTag).not.toHaveBeenCalled()
  })

  it('returns not found when deleting a missing tag', async () => {
    const repository = createRepository({
      deleteTag: vi.fn(async () => false),
    })
    const service = createTaxonomyService(repository)

    await expect(service.deleteTag(admin, 404)).rejects.toMatchObject({
      status: 404,
      message: '标签不存在',
    })
  })

  it('maps tag delete foreign key races to referenced conflicts', async () => {
    const repository = createRepository({
      isTagReferenced: vi.fn(async () => false),
      deleteTag: vi.fn(async () => {
        throw Object.assign(new Error('update or delete on table violates foreign key constraint'), {
          code: '23503',
        })
      }),
    })
    const service = createTaxonomyService(repository)

    await expect(service.deleteTag(admin, 1)).rejects.toMatchObject({
      status: 409,
      message: '标签已被文章引用，不能删除',
    })
  })

  it('maps duplicate category names to conflict responses', async () => {
    const repository = createRepository({
      createCategory: vi.fn(async () => {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          code: '23505',
        })
      }),
    })
    const service = createTaxonomyService(repository)

    await expect(service.createCategory(admin, {
      name: 'Vue 3',
      description: 'Duplicate',
    })).rejects.toMatchObject({
      status: 409,
      message: '分类名称已存在',
    })
  })

  it('maps duplicate tag names to conflict responses', async () => {
    const repository = createRepository({
      updateTag: vi.fn(async () => {
        throw Object.assign(new Error('duplicate key value violates unique constraint'), {
          code: '23505',
        })
      }),
    })
    const service = createTaxonomyService(repository)

    await expect(service.updateTag(admin, 1, {
      name: 'Vite',
    })).rejects.toMatchObject({
      status: 409,
      message: '标签名称已存在',
    })
  })
})
