export type FeedScope = 'ALL' | 'FOLLOWING'

export function feedPathForScope(scope: FeedScope, category?: string, query?: string): string {
  const params = new URLSearchParams()
  if (scope === 'FOLLOWING') params.set('tab', 'following')
  if (category) params.set('category', category)
  if (query) params.set('q', query)
  const queryString = params.toString()
  return queryString ? `/community?${queryString}` : '/community'
}
