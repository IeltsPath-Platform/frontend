import { describe, expect, it } from 'vitest'
import { lemmaCandidates, pickEntry } from './wordLookupApi'

describe('lemmaCandidates', () => {
  it('tries the word as written first', () => {
    expect(lemmaCandidates('Audiobook')[0]).toBe('audiobook')
  })

  it('adds the singular of a plural', () => {
    expect(lemmaCandidates('audiobooks')).toContain('audiobook')
    expect(lemmaCandidates('studies')).toContain('study')
    expect(lemmaCandidates('boxes')).toContain('box')
  })

  it('adds the base form of a verb ending', () => {
    expect(lemmaCandidates('wanders')).toContain('wander')
    expect(lemmaCandidates('removed')).toContain('remove')
    expect(lemmaCandidates('growing')).toContain('grow')
  })

  it('turns "ied", "ier" and "iest" back into "y"', () => {
    expect(lemmaCandidates('relied')).toContain('rely')
    expect(lemmaCandidates('easier')).toContain('easy')
    expect(lemmaCandidates('healthiest')).toContain('healthy')
  })

  it('adds the adjective of an adverb', () => {
    expect(lemmaCandidates('easily')).toContain('easy')
    expect(lemmaCandidates('slowly')).toContain('slow')
  })

  it('drops a possessive and never returns a one-letter form', () => {
    expect(lemmaCandidates('writer\'s')).toContain('writer')
    expect(lemmaCandidates('as').every((form) => form.length >= 2)).toBe(true)
  })

  it('does not strip an "s" from a word that ends in "ss"', () => {
    expect(lemmaCandidates('class')).not.toContain('clas')
  })
})

describe('pickEntry', () => {
  const sense = { partOfSpeech: 'NOUN', englishDefinition: 'a book', vietnameseMeaning: 'sách', exampleSentence: null }

  it('picks the item whose lemma is exactly a form asked for', () => {
    const entry = pickEntry([
      { lemma: 'downloads', normalizedLemma: 'downloads', senses: [] },
      { lemma: 'download', normalizedLemma: 'download', ipa: ' /ˈdaʊnləʊd/ ', senses: [sense] },
    ], ['download'])
    expect(entry?.lemma).toBe('download')
    expect(entry?.ipa).toBe('/ˈdaʊnləʊd/')
    expect(entry?.senses).toHaveLength(1)
  })

  it('prefers the first form that has a meaning over an earlier form that only has a pronunciation', () => {
    const entry = pickEntry([
      { lemma: 'lives', normalizedLemma: 'lives', ipa: '/laɪvz/', senses: [] },
      { lemma: 'live', normalizedLemma: 'live', ipa: '/lɪv/', senses: [sense] },
    ], ['lives', 'live'])
    expect(entry?.lemma).toBe('live')
  })

  it('falls back to a word that only has a pronunciation', () => {
    const entry = pickEntry([{ lemma: 'respectable', normalizedLemma: 'respectable', ipa: '/riˈspɛktəbəl/', senses: [] }], ['respectable'])
    expect(entry).toEqual({ lemma: 'respectable', ipa: '/riˈspɛktəbəl/', audioUk: null, audioUs: null, senses: [] })
  })

  it('carries the recording of each accent, and treats a blank one as missing', () => {
    const entry = pickEntry([{
      lemma: 'surface', normalizedLemma: 'surface', ipa: '/ˈsɜːfəs/', audioUk: ' https://media/uk/surface.mp3 ', audioUs: ' ', senses: [sense],
    }], ['surface'])
    expect(entry?.audioUk).toBe('https://media/uk/surface.mp3')
    expect(entry?.audioUs).toBeNull()
  })

  it('falls back to a word that only has a recording', () => {
    const entry = pickEntry([{ lemma: 'quay', normalizedLemma: 'quay', audioUs: 'https://media/us/quay.mp3', senses: [] }], ['quay'])
    expect(entry?.audioUs).toBe('https://media/us/quay.mp3')
  })

  it('ignores a sense with neither a meaning nor a definition', () => {
    const entry = pickEntry([{ lemma: 'run', normalizedLemma: 'run', ipa: '/rʌn/', senses: [{ ...sense, vietnameseMeaning: ' ', englishDefinition: null }] }], ['run'])
    expect(entry?.senses).toEqual([])
  })

  it('returns null when no item matches, or a match has neither meaning nor pronunciation', () => {
    expect(pickEntry([{ lemma: 'downloads', normalizedLemma: 'downloads', senses: [sense] }], ['download'])).toBeNull()
    expect(pickEntry([{ lemma: 'run', normalizedLemma: 'run', senses: [] }], ['run'])).toBeNull()
  })
})
