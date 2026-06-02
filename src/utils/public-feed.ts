export interface PublicFeedPaginationState {
  page: number
  totalPages: number
  loading?: boolean
}

export function canLoadNextPublicFeedPage(state: PublicFeedPaginationState) {
  return state.loading !== true && state.totalPages > 0 && state.page < state.totalPages
}

export function getNextPublicFeedPage(state: PublicFeedPaginationState) {
  return canLoadNextPublicFeedPage(state) ? state.page + 1 : null
}
