import type { LocationQuery, LocationQueryRaw, LocationQueryValue } from 'vue-router'

import type { PublicArticleListFilterState } from '@/types/article'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 20
const ALLOWED_PAGE_SIZES = new Set([10, 20, 50])

function getQueryValue(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

function parseStrictPositiveInt(value: LocationQueryValue | LocationQueryValue[] | number | undefined) {
  const rawValue = typeof value === 'number' ? value : getQueryValue(value)

  if (typeof rawValue !== 'string' && typeof rawValue !== 'number') {
    return null
  }

  const text = String(rawValue).trim()

  if (!/^\d+$/.test(text)) {
    return null
  }

  const parsed = Number(text)

  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null
}

function parsePositiveInt(value: LocationQueryValue | LocationQueryValue[] | undefined, fallback: number) {
  return parseStrictPositiveInt(value) ?? fallback
}

function parseIdList(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  const rawValues = Array.isArray(value) ? value : value ? [value] : []

  return rawValues
    .filter((item): item is string => typeof item === 'string')
    .flatMap((item) => item.split(','))
    .map((item) => parseStrictPositiveInt(item))
    .filter((item): item is number => item !== null)
}

function normalizeKeyword(value: LocationQueryValue | LocationQueryValue[] | undefined) {
  return (getQueryValue(value) ?? '').trim()
}

function areNumberArraysEqual(left: number[], right: number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index])
}

export function normalizePageSize(value: LocationQueryValue | LocationQueryValue[] | number | undefined) {
  const parsed = parseStrictPositiveInt(value)

  return parsed !== null && ALLOWED_PAGE_SIZES.has(parsed) ? parsed : DEFAULT_PAGE_SIZE
}

export function parseArticleListQuery(query: LocationQuery): PublicArticleListFilterState {
  const sortField = getQueryValue(query.sortField)
  const sortOrder = getQueryValue(query.sortOrder)

  return {
    page: parsePositiveInt(query.page, DEFAULT_PAGE),
    pageSize: normalizePageSize(query.pageSize),
    keyword: normalizeKeyword(query.keyword),
    categoryIds: parseIdList(query.categoryIds),
    tagIds: parseIdList(query.tagIds),
    sortField: sortField === 'publishTime' || sortField === 'updateTime' ? sortField : undefined,
    sortOrder: sortOrder === 'asc' || sortOrder === 'desc' ? sortOrder : undefined,
  }
}

export function buildArticleListQuery(
  nextFilters: PublicArticleListFilterState,
  previousFilters?: PublicArticleListFilterState,
): LocationQueryRaw {
  const normalizedFilters: PublicArticleListFilterState = {
    ...nextFilters,
    page: nextFilters.page > 0 ? nextFilters.page : DEFAULT_PAGE,
    pageSize: normalizePageSize(nextFilters.pageSize),
    keyword: nextFilters.keyword.trim(),
  }

  const shouldResetPage =
    previousFilters !== undefined &&
    (normalizedFilters.keyword !== previousFilters.keyword.trim() ||
      !areNumberArraysEqual(normalizedFilters.categoryIds, previousFilters.categoryIds) ||
      !areNumberArraysEqual(normalizedFilters.tagIds, previousFilters.tagIds) ||
      normalizedFilters.sortField !== previousFilters.sortField ||
      normalizedFilters.sortOrder !== previousFilters.sortOrder)

  const page = shouldResetPage ? DEFAULT_PAGE : normalizedFilters.page
  const query: LocationQueryRaw = {
    page: String(page),
    pageSize: String(normalizedFilters.pageSize),
  }

  if (normalizedFilters.keyword) {
    query.keyword = normalizedFilters.keyword
  }

  if (normalizedFilters.categoryIds.length > 0) {
    query.categoryIds = normalizedFilters.categoryIds.join(',')
  }

  if (normalizedFilters.tagIds.length > 0) {
    query.tagIds = normalizedFilters.tagIds.join(',')
  }

  if (normalizedFilters.sortField) {
    query.sortField = normalizedFilters.sortField
  }

  if (normalizedFilters.sortOrder) {
    query.sortOrder = normalizedFilters.sortOrder
  }

  return query
}
