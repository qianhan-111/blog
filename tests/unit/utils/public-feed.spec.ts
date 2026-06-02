import { describe, expect, it } from 'vitest'

import { canLoadNextPublicFeedPage, getNextPublicFeedPage } from '@/utils/public-feed'

describe('public feed pagination helpers', () => {
  it('allows loading when another page exists and no request is active', () => {
    expect(
      canLoadNextPublicFeedPage({
        loading: false,
        page: 1,
        totalPages: 3,
      }),
    ).toBe(true)
  })

  it('blocks loading while already loading', () => {
    expect(
      canLoadNextPublicFeedPage({
        loading: true,
        page: 1,
        totalPages: 3,
      }),
    ).toBe(false)
  })

  it('blocks loading when the feed is already at the final page', () => {
    expect(
      canLoadNextPublicFeedPage({
        loading: false,
        page: 3,
        totalPages: 3,
      }),
    ).toBe(false)
  })

  it('returns the next page only when loading is allowed', () => {
    expect(
      getNextPublicFeedPage({
        loading: false,
        page: 2,
        totalPages: 4,
      }),
    ).toBe(3)

    expect(
      getNextPublicFeedPage({
        loading: true,
        page: 2,
        totalPages: 4,
      }),
    ).toBeNull()
  })
})
