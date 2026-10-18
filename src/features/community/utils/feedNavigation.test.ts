import { describe, expect, it } from 'vitest'
import { feedPathForScope } from './feedNavigation'

describe('feedPathForScope', () => {
  it('keeps all as the default route and preserves a selected category', () => {
    expect(feedPathForScope('ALL')).toBe('/community')
    expect(feedPathForScope('ALL', 'QUESTION')).toBe('/community?category=QUESTION')
  })

  it('encodes following scope in the URL without dropping the category', () => {
    expect(feedPathForScope('FOLLOWING', 'RESOURCE TIPS')).toBe('/community?tab=following&category=RESOURCE+TIPS')
  })

  it('preserves the search query when changing feed scope', () => {
    expect(feedPathForScope('FOLLOWING', 'QUESTION', 'reading IELTS')).toBe('/community?tab=following&category=QUESTION&q=reading+IELTS')
  })
})
