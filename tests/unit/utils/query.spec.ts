import { describe, expect, it } from 'vitest'

import { buildArticleListQuery, normalizePageSize, parseArticleListQuery } from '@/utils/query'

const baseFilters = {
  page: 4,
  pageSize: 20,
  keyword: 'vue',
  categoryIds: [1],
  tagIds: [8],
  sortField: 'publishTime' as const,
  sortOrder: 'desc' as const,
}

describe('article list query helpers', () => {
  it('parses a route query into normalized filter state', () => {
    const filters = parseArticleListQuery({
      page: '3',
      pageSize: '50',
      keyword: 'vue',
      categoryIds: '1,2,3',
      tagIds: ['7,8'],
      sortField: 'updateTime',
      sortOrder: 'asc',
    })

    expect(filters).toEqual({
      page: 3,
      pageSize: 50,
      keyword: 'vue',
      categoryIds: [1, 2, 3],
      tagIds: [7, 8],
      sortField: 'updateTime',
      sortOrder: 'asc',
    })
  })

  it('parses multi-value categoryIds and tagIds from route query arrays', () => {
    const filters = parseArticleListQuery({
      page: '1',
      pageSize: '20',
      categoryIds: ['1', '2,3'],
      tagIds: ['7', '8,9'],
    })

    expect(filters.categoryIds).toEqual([1, 2, 3])
    expect(filters.tagIds).toEqual([7, 8, 9])
  })

  it('ignores null entries when parsing multi-value route query arrays', () => {
    const filters = parseArticleListQuery({
      categoryIds: ['1', null, '2,3'],
      tagIds: [null, '7', '8,9'],
    })

    expect(filters.categoryIds).toEqual([1, 2, 3])
    expect(filters.tagIds).toEqual([7, 8, 9])
  })

  it('ignores malformed numeric query values instead of partially parsing them', () => {
    const filters = parseArticleListQuery({
      page: '2abc',
      pageSize: '50abc',
      categoryIds: ['1abc', '2'],
      tagIds: '7,8xyz,9',
    })

    expect(filters).toMatchObject({
      page: 1,
      pageSize: 20,
      categoryIds: [2],
      tagIds: [7, 9],
    })
  })

  it('removes empty filters when serializing', () => {
    const query = buildArticleListQuery({
      page: 2,
      pageSize: 20,
      keyword: '   ',
      categoryIds: [],
      tagIds: [],
      sortField: undefined,
      sortOrder: undefined,
    })

    expect(query).toEqual({
      page: '2',
      pageSize: '20',
    })
  })

  it('resets page to 1 when keyword changes', () => {
    const query = buildArticleListQuery({ ...baseFilters, keyword: 'react' }, baseFilters)

    expect(query.page).toBe('1')
  })

  it('resets page to 1 when categoryIds changes', () => {
    const query = buildArticleListQuery({ ...baseFilters, categoryIds: [2] }, baseFilters)

    expect(query.page).toBe('1')
  })

  it('resets page to 1 when tagIds changes', () => {
    const query = buildArticleListQuery({ ...baseFilters, tagIds: [9] }, baseFilters)

    expect(query.page).toBe('1')
  })

  it('resets page to 1 when sort changes', () => {
    const query = buildArticleListQuery(
      { ...baseFilters, sortField: 'updateTime', sortOrder: 'asc' },
      baseFilters,
    )

    expect(query.page).toBe('1')
  })

  it('normalizes invalid page sizes to the default page size', () => {
    expect(normalizePageSize('0')).toBe(20)
    expect(normalizePageSize('999')).toBe(20)
    expect(normalizePageSize(undefined)).toBe(20)
  })
})
