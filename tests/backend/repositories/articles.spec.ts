// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'

import {
  createArticle,
  getArticlePrevNext,
  getPublicArticleDetail,
  listAuthorPublishedArticles,
  listPublicArticles,
  updateArticle,
} from '../../../src/server/repositories/articles'
import type { SqlQuery } from '../../../src/server/db'
import type { ArticleFormPayload } from '../../../src/server/types'

function createSqlMock(query: ReturnType<typeof vi.fn>) {
  return { query } as unknown as SqlQuery
}

describe('article repository database guards', () => {
  it('keeps articles from disabled authors out of the public article list', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('COUNT(*)')) {
        return [{ total: 0 }]
      }

      return []
    })

    await listPublicArticles({ page: 1, pageSize: 20 }, createSqlMock(query))

    expect(query.mock.calls[0]?.[0]).toContain("u.status = 'enabled'")
    expect(query.mock.calls[1]?.[0]).toContain("u.status = 'enabled'")
  })

  it('keeps disabled authors out of public author article lists', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('COUNT(*)')) {
        return [{ total: 0 }]
      }

      return []
    })

    await listAuthorPublishedArticles(7, { page: 1, pageSize: 20 }, createSqlMock(query))

    expect(query.mock.calls[0]?.[0]).toContain("u.status = 'enabled'")
    expect(query.mock.calls[1]?.[0]).toContain("u.status = 'enabled'")
  })

  it('keeps public article detail hidden when the author is disabled', async () => {
    const query = vi.fn(async () => [])

    await getPublicArticleDetail(10, createSqlMock(query))

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("u.status = 'enabled'"),
      [10],
    )
  })

  it('keeps disabled authors out of public prev-next navigation', async () => {
    const publishTime = '2026-05-12T00:00:00.000Z'
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('SELECT a.publish_time')) {
        return [{ publish_time: publishTime }]
      }

      return []
    })

    await getArticlePrevNext(11, createSqlMock(query))

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("u.status = 'enabled'"),
      [11],
    )
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("u.status = 'enabled'"),
      [publishTime, 11],
    )
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("u.status = 'enabled'"),
      [publishTime, 11],
    )
  })

  it('rejects missing category ids before inserting the article row', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM categories')) {
        return [{ total: 0 }]
      }

      if (statement.includes('INSERT INTO articles')) {
        return [{ id: 10 }]
      }

      return []
    })
    const payload: ArticleFormPayload = {
      status: 'published',
      title: 'Article',
      contentMarkdown: '# Article',
      categoryIds: [999],
      tagIds: [],
    }

    await expect(createArticle(7, payload, {}, createSqlMock(query))).rejects.toMatchObject({
      status: 400,
      message: '分类不存在',
    })
    expect(query).not.toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO articles'),
      expect.anything(),
    )
  })

  it('finds prev and next articles that share the same publish time', async () => {
    const publishTime = '2026-05-12T00:00:00.000Z'
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('SELECT a.publish_time')) {
        return [{ publish_time: publishTime }]
      }

      if (statement.includes('id < $2')) {
        return [{ id: 10, title: 'Earlier same-time article' }]
      }

      if (statement.includes('id > $2')) {
        return [{ id: 12, title: 'Later same-time article' }]
      }

      return []
    })

    await expect(getArticlePrevNext(11, createSqlMock(query))).resolves.toEqual({
      prev: { id: 10, title: 'Earlier same-time article' },
      next: { id: 12, title: 'Later same-time article' },
    })
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('id < $2'),
      [publishTime, 11],
    )
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('id > $2'),
      [publishTime, 11],
    )
  })

  it('returns null without replacing taxonomy when the article disappears during update', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM categories')) {
        return [{ total: 1 }]
      }

      if (statement.includes('FROM tags')) {
        return [{ total: 0 }]
      }

      if (statement.includes('UPDATE articles')) {
        return []
      }

      return []
    })
    const payload: ArticleFormPayload = {
      status: 'published',
      title: 'Published',
      contentMarkdown: '# Published',
      categoryIds: [1],
      tagIds: [],
    }

    await expect(updateArticle(404, payload, { publishTime: '2026-05-17T01:00:00.000Z' }, createSqlMock(query)))
      .resolves.toBeNull()

    const writeQueries = query.mock.calls.filter(([statement]) =>
      statement.includes('UPDATE articles') ||
      statement.includes('DELETE FROM article_categories') ||
      statement.includes('INSERT INTO article_categories') ||
      statement.includes('DELETE FROM article_tags') ||
      statement.includes('INSERT INTO article_tags'),
    )

    expect(writeQueries).toHaveLength(1)
  })

  it('maps category foreign key races during taxonomy replacement to a missing category error', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM categories')) {
        return [{ total: 1 }]
      }

      if (statement.includes('FROM tags')) {
        return [{ total: 0 }]
      }

      if (statement.includes('UPDATE articles') && statement.includes('INSERT INTO article_categories')) {
        throw Object.assign(new Error('insert or update on table violates foreign key constraint'), {
          code: '23503',
          constraint: 'article_categories_category_id_fkey',
        })
      }

      return []
    })
    const payload: ArticleFormPayload = {
      status: 'published',
      title: 'Published',
      contentMarkdown: '# Published',
      categoryIds: [1],
      tagIds: [],
    }

    await expect(updateArticle(10, payload, { publishTime: '2026-05-17T01:00:00.000Z' }, createSqlMock(query)))
      .rejects.toMatchObject({
        status: 400,
        message: '分类不存在',
      })
  })

  it('updates article content and taxonomy in a single atomic database statement', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM categories')) {
        return [{ total: 1 }]
      }

      if (statement.includes('FROM tags')) {
        return [{ total: 1 }]
      }

      if (statement.includes('UPDATE articles') && statement.includes('INSERT INTO article_categories')) {
        return [{ id: 10 }]
      }

      return []
    })
    const payload: ArticleFormPayload = {
      status: 'published',
      title: 'Published',
      contentMarkdown: '# Published',
      categoryIds: [1],
      tagIds: [2],
    }

    await updateArticle(10, payload, { publishTime: '2026-05-17T01:00:00.000Z' }, createSqlMock(query))

    const writeQueries = query.mock.calls.filter(([statement]) =>
      statement.includes('UPDATE articles') ||
      statement.includes('DELETE FROM article_categories') ||
      statement.includes('INSERT INTO article_categories') ||
      statement.includes('DELETE FROM article_tags') ||
      statement.includes('INSERT INTO article_tags'),
    )

    expect(writeQueries).toHaveLength(1)
    expect(writeQueries[0]?.[0]).toContain('UPDATE articles')
    expect(writeQueries[0]?.[0]).toContain('DELETE FROM article_categories')
    expect(writeQueries[0]?.[0]).toContain('INSERT INTO article_categories')
    expect(writeQueries[0]?.[0]).toContain('DELETE FROM article_tags')
    expect(writeQueries[0]?.[0]).toContain('INSERT INTO article_tags')
  })

  it('maps tag foreign key races during taxonomy replacement to a missing tag error', async () => {
    const query = vi.fn(async (statement: string) => {
      if (statement.includes('FROM categories')) {
        return [{ total: 1 }]
      }

      if (statement.includes('FROM tags')) {
        return [{ total: 1 }]
      }

      if (statement.includes('UPDATE articles') && statement.includes('INSERT INTO article_tags')) {
        throw Object.assign(new Error('insert or update on table violates foreign key constraint'), {
          code: '23503',
          constraint: 'article_tags_tag_id_fkey',
        })
      }

      return []
    })
    const payload: ArticleFormPayload = {
      status: 'published',
      title: 'Published',
      contentMarkdown: '# Published',
      categoryIds: [1],
      tagIds: [2],
    }

    await expect(updateArticle(10, payload, { publishTime: '2026-05-17T01:00:00.000Z' }, createSqlMock(query)))
      .rejects.toMatchObject({
        status: 400,
        message: '标签不存在',
      })
  })
})
