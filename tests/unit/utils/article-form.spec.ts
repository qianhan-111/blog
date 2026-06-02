import { describe, expect, it } from 'vitest'

import { validateArticlePayload } from '@/utils/article-form'

describe('article form validation', () => {
  it('requires title, categoryIds, and contentMarkdown when publishing', () => {
    expect(
      validateArticlePayload({
        status: 'published',
        title: '',
        categoryIds: [],
        contentMarkdown: '',
      }),
    ).toEqual({
      valid: false,
      errors: ['标题不能为空', '至少选择一个分类', '正文不能为空'],
    })
  })

  it('allows partial fields when saving a draft', () => {
    expect(
      validateArticlePayload({
        status: 'draft',
        summary: 'Partial draft',
      }),
    ).toEqual({
      valid: true,
      errors: [],
    })
  })
})
