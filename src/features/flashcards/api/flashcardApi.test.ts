import { describe, expect, it } from 'vitest'
import { parseBulkCards, validateImage } from './flashcardApi'

describe('parseBulkCards', () => {
  it('splits each line on dash, colon, equals or tab and skips invalid lines', () => {
    expect(parseBulkCards('pollution - ô nhiễm\nrenewable: tái tạo\n\nno separator\nfuel=nhiên liệu\nsolar\tmặt trời')).toEqual([
      { front: 'pollution', back: 'ô nhiễm' },
      { front: 'renewable', back: 'tái tạo' },
      { front: 'fuel', back: 'nhiên liệu' },
      { front: 'solar', back: 'mặt trời' },
    ])
  })

  it('keeps hyphenated words intact', () => {
    expect(parseBulkCards('well-being - hạnh phúc')).toEqual([{ front: 'well-being', back: 'hạnh phúc' }])
  })
})

describe('validateImage', () => {
  it('rejects unsupported types and files over 2 MB', () => {
    expect(validateImage(new File(['x'], 'a.gif', { type: 'image/gif' }))).not.toBeNull()
    expect(validateImage(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'a.png', { type: 'image/png' }))).not.toBeNull()
    expect(validateImage(new File(['x'], 'a.webp', { type: 'image/webp' }))).toBeNull()
  })
})
