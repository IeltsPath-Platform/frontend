import { describe, expect, it } from 'vitest'
import { resolveSearchLang, splitHighlight } from './dictionary-search'

describe('resolveSearchLang', () => {
  it('keeps the chosen language for plain Latin text', () => {
    expect(resolveSearchLang('environment', 'EN')).toBe('EN')
    expect(resolveSearchLang('moi truong', 'VI')).toBe('VI')
  })

  it('searches Vietnamese meanings whenever the text has Vietnamese letters', () => {
    expect(resolveSearchLang('bền vững', 'EN')).toBe('VI')
    expect(resolveSearchLang('Đa dạng', 'EN')).toBe('VI')
  })
})

describe('splitHighlight', () => {
  it('marks every case-insensitive match', () => {
    expect(splitHighlight('Sustainable sustain', 'sustain')).toEqual([
      { text: 'Sustain', match: true },
      { text: 'able ', match: false },
      { text: 'sustain', match: true },
    ])
  })

  it('returns the whole text when there is no keyword or match', () => {
    expect(splitHighlight('habitat', '')).toEqual([{ text: 'habitat', match: false }])
    expect(splitHighlight('habitat', 'zz')).toEqual([{ text: 'habitat', match: false }])
  })
})
