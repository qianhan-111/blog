import type { ArticleFormPayload } from '@/types/article'

export function validateArticlePayload(payload: ArticleFormPayload) {
  if (payload.status === 'draft') {
    return {
      valid: true,
      errors: [] as string[],
    }
  }

  const errors: string[] = []

  if (!payload.title.trim()) {
    errors.push('标题不能为空')
  }

  if (!payload.categoryIds.length) {
    errors.push('至少选择一个分类')
  }

  if (!payload.contentMarkdown.trim()) {
    errors.push('正文不能为空')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
