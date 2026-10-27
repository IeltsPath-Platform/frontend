import { describe, expect, it } from 'vitest'
import { bandText } from './topicHelpers'

describe('bandText', () => {
  it.each([
    [undefined, undefined, 'Mọi band'],
    [null, null, 'Mọi band'],
    [5, 6, '5.0 – 6.0'],
    [5.5, 5.5, 'Band 5.5'],
    [6, null, 'Từ 6.0'],
    [null, 6.5, 'Đến 6.5'],
  ])('writes %s to %s as %s', (min, max, expected) => {
    expect(bandText(min, max)).toBe(expected)
  })
})
