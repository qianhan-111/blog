import { isForeignKeyConstraintError, isUniqueConstraintError } from '../db-errors.js'
import { ApiError } from '../errors.js'
import * as taxonomyRepository from '../repositories/taxonomy.js'
import type { Category, CategoryPayload, CurrentUser, Tag, TagPayload } from '../types.js'

export interface TaxonomyRepository {
  createCategory(payload: CategoryPayload): Promise<Category>
  createTag(payload: TagPayload): Promise<Tag>
  deleteCategory(id: number): Promise<boolean>
  deleteTag(id: number): Promise<boolean>
  isCategoryReferenced(id: number): Promise<boolean>
  isTagReferenced(id: number): Promise<boolean>
  listCategories(): Promise<Category[]>
  listTags(): Promise<Tag[]>
  updateCategory(id: number, payload: CategoryPayload): Promise<Category | null>
  updateTag(id: number, payload: TagPayload): Promise<Tag | null>
}

const defaultTaxonomyRepository: TaxonomyRepository = taxonomyRepository

function assertAdmin(user: CurrentUser): void {
  if (user.status !== 'enabled') {
    throw new ApiError(403, '账号已被禁用')
  }

  if (user.role !== 'admin') {
    throw new ApiError(403, '没有访问权限')
  }
}

async function mapUniqueConflict<T>(operation: () => Promise<T>, message: string): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new ApiError(409, message)
    }

    throw error
  }
}

async function mapForeignKeyConflict<T>(operation: () => Promise<T>, message: string): Promise<T> {
  try {
    return await operation()
  } catch (error) {
    if (isForeignKeyConstraintError(error)) {
      throw new ApiError(409, message)
    }

    throw error
  }
}

export function createTaxonomyService(repository: TaxonomyRepository = defaultTaxonomyRepository) {
  return {
    listCategories() {
      return repository.listCategories()
    },

    listTags() {
      return repository.listTags()
    },

    createCategory(user: CurrentUser, payload: CategoryPayload) {
      assertAdmin(user)
      return mapUniqueConflict(() => repository.createCategory(payload), '分类名称已存在')
    },

    async updateCategory(user: CurrentUser, id: number, payload: CategoryPayload) {
      assertAdmin(user)
      const category = await mapUniqueConflict(
        () => repository.updateCategory(id, payload),
        '分类名称已存在',
      )

      if (!category) {
        throw new ApiError(404, '分类不存在')
      }

      return category
    },

    async deleteCategory(user: CurrentUser, id: number) {
      assertAdmin(user)

      if (await repository.isCategoryReferenced(id)) {
        throw new ApiError(409, '分类已被文章引用，不能删除')
      }

      const deleted = await mapForeignKeyConflict(
        () => repository.deleteCategory(id),
        '分类已被文章引用，不能删除',
      )

      if (!deleted) {
        throw new ApiError(404, '分类不存在')
      }

      return null
    },

    createTag(user: CurrentUser, payload: TagPayload) {
      assertAdmin(user)
      return mapUniqueConflict(() => repository.createTag(payload), '标签名称已存在')
    },

    async updateTag(user: CurrentUser, id: number, payload: TagPayload) {
      assertAdmin(user)
      const tag = await mapUniqueConflict(
        () => repository.updateTag(id, payload),
        '标签名称已存在',
      )

      if (!tag) {
        throw new ApiError(404, '标签不存在')
      }

      return tag
    },

    async deleteTag(user: CurrentUser, id: number) {
      assertAdmin(user)

      if (await repository.isTagReferenced(id)) {
        throw new ApiError(409, '标签已被文章引用，不能删除')
      }

      const deleted = await mapForeignKeyConflict(
        () => repository.deleteTag(id),
        '标签已被文章引用，不能删除',
      )

      if (!deleted) {
        throw new ApiError(404, '标签不存在')
      }

      return null
    },
  }
}

export const taxonomyService = createTaxonomyService()
