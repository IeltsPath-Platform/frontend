import { describe, expect, it } from 'vitest'
import { withVocabularyCore } from './summaryVocabulary'

const TABLE = '## Vocabulary Core\n\n| Từ | Nghĩa |\n| --- | --- |\n'

describe('withVocabularyCore', () => {
  it('appends the words as a table after the summary', () => {
    expect(withVocabularyCore('## Key Points\n\n- one', [{ lemma: 'topic', meaning: 'chủ đề' }, { lemma: 'infer', meaning: 'suy luận' }]))
      .toBe(`## Key Points\n\n- one\n\n${TABLE}| topic | chủ đề |\n| infer | suy luận |`)
  })

  it('gives a lesson with no summary just the table, and one with no words its text as it is', () => {
    expect(withVocabularyCore(null, [{ lemma: 'topic', meaning: 'chủ đề' }])).toBe(`${TABLE}| topic | chủ đề |`)
    expect(withVocabularyCore('- one', [])).toBe('- one')
    expect(withVocabularyCore(null, [{ lemma: ' ' }])).toBe('')
  })

  it('leaves a summary that already has the section as it is', () => {
    const own = '## Vocabulary Core\n\n| Từ | Nghĩa |\n| --- | --- |\n| mine | của tôi |'

    expect(withVocabularyCore(own, [{ lemma: 'topic', meaning: 'chủ đề' }])).toBe(own)
  })

  it('lists a word once whatever its case, with the first spelling and the first meaning given', () => {
    expect(withVocabularyCore(null, [{ lemma: 'Topic', meaning: '' }, { lemma: 'topic', meaning: 'chủ đề' }, { lemma: 'TOPIC', meaning: 'khác' }]))
      .toBe(`${TABLE}| Topic | chủ đề |`)
  })

  it('shows a dash for a missing meaning and keeps a pipe from breaking the table', () => {
    expect(withVocabularyCore(null, [{ lemma: 'a|b' }, { lemma: 'two\nlines', meaning: 'x | y' }]))
      .toBe(`${TABLE}| a\\|b | — |\n| two lines | x \\| y |`)
  })
})
