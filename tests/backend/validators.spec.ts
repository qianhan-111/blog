// @vitest-environment node
import { describe, expect, it } from 'vitest'

import {
  adminArticleListQuerySchema,
  adminUserListQuerySchema,
  articleListQuerySchema,
  articlePayloadSchema,
  authorArticleListQuerySchema,
  profileUpdateSchema,
  registerPayloadSchema,
} from '../../src/server/validators'

describe('backend validators', () => {
  it('accepts published articles with title, content, and category IDs', () => {
    expect(articlePayloadSchema.parse({
      status: 'published',
      title: 'Hello',
      contentMarkdown: '# Hello',
      categoryIds: [1],
      tagIds: [],
      summary: '',
      coverUrl: '',
    })).toMatchObject({ status: 'published' })
  })

  it('rejects non-numeric taxonomy IDs in article payloads', () => {
    expect(() => articlePayloadSchema.parse({
      status: 'published',
      title: 'Hello',
      contentMarkdown: '# Hello',
      categoryIds: [true],
      tagIds: ['1'],
    })).toThrow()
  })

  it('rejects boolean category IDs on published article payloads', () => {
    expect(() => articlePayloadSchema.parse({
      status: 'published',
      title: 'Hello',
      contentMarkdown: '# Hello',
      categoryIds: [true],
      tagIds: [],
    })).toThrow()
  })

  it('rejects register payloads with mismatched passwords', () => {
    expect(() => registerPayloadSchema.parse({
      username: 'demo',
      email: 'demo@example.com',
      password: '123456',
      confirmPassword: '654321',
    })).toThrow()
  })

  it('preserves omitted optional profile fields during partial updates', () => {
    expect(profileUpdateSchema.parse({
      nickname: ' Updated ',
    })).toEqual({
      nickname: 'Updated',
    })
  })

  it('does not partially parse malformed numeric filter IDs', () => {
    expect(articleListQuerySchema.parse({
      categoryIds: ['1abc', '2'],
      tagIds: '7,8xyz,9',
    })).toMatchObject({
      categoryIds: [2],
      tagIds: [7, 9],
    })
  })

  it('parses bracketed array filter IDs from axios query strings', () => {
    expect(articleListQuerySchema.parse({
      'categoryIds[]': ['1', '2'],
      'tagIds[]': ['7', '8'],
    })).toMatchObject({
      categoryIds: [1, 2],
      tagIds: [7, 8],
    })
  })

  it('treats empty optional query filters as omitted', () => {
    expect(articleListQuerySchema.parse({
      sortField: '',
      sortOrder: '',
    })).toMatchObject({
      sortField: undefined,
      sortOrder: undefined,
    })
    expect(authorArticleListQuerySchema.parse({ status: '' })).toMatchObject({
      status: undefined,
    })
    expect(adminArticleListQuerySchema.parse({
      authorId: '',
      status: '',
    })).toMatchObject({
      authorId: undefined,
      status: undefined,
    })
    expect(adminUserListQuerySchema.parse({ status: '' })).toMatchObject({
      status: undefined,
    })
  })
})
