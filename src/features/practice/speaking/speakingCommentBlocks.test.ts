import { describe, expect, it } from 'vitest'
import { commentBlocks, splitComment } from './speakingCommentBlocks'

describe('splitComment', () => {
  it('puts the paragraph that begins "Để lên band N" and its steps in the way to the next band', () => {
    const parts = splitComment('Em bị giữ ở band 4 vì từ sai nghĩa.\n\nNgoài ra em lặp "very" 5 lần.\n\nĐể lên band 5, em cần:\n1. Diễn đạt lại khi quên từ.\n2. Học 5 collocation.')

    expect(parts.diagnosis).toEqual([{ kind: 'p', text: 'Em bị giữ ở band 4 vì từ sai nghĩa.' }, { kind: 'p', text: 'Ngoài ra em lặp "very" 5 lần.' }])
    expect(parts.next).toEqual({
      band: '5',
      blocks: [{ kind: 'p', text: 'Em cần:' }, { kind: 'list', items: ['Diễn đạt lại khi quên từ.', 'Học 5 collocation.'] }],
    })
  })

  it('finds the turn in a comment stored as one line and reads "Band 5.5 hoặc 6.0" as the first band', () => {
    const parts = splitComment('Thí sinh ở mức Band 5.0 về từ vựng, vốn từ còn hạn chế và hay dùng từ chung chung, lặp lại nhiều lần trong bài như good, a lot và very ở gần như mọi câu em nói, khiến nội dung không tập trung. '
      + 'Để đạt Band 5.5 hoặc 6.0, thí sinh cần mở rộng vốn từ chủ đề và tránh lặp từ.')

    expect(parts.diagnosis).toHaveLength(1)
    expect(parts.next).toEqual({ band: '5.5', blocks: [{ kind: 'p', text: 'Thí sinh cần mở rộng vốn từ chủ đề và tránh lặp từ.' }] })
  })

  it('leaves a comment without that paragraph as the diagnosis alone', () => {
    expect(splitComment('Band Phát âm được ước tính tự động.')).toEqual({ diagnosis: [{ kind: 'p', text: 'Band Phát âm được ước tính tự động.' }], next: null })
    expect(splitComment('')).toEqual({ diagnosis: [], next: null })
  })
})

/** A comment as it was stored before the prompt asked for paragraphs: one long line. */
const ONE_LINE = 'Điểm giữ em ở band 4 là LR: em có vài collocation tốt ("contact my friends", "manage my schedule") nhưng phần lớn câu '
  + 'còn lại dùng từ sai nghĩa hoặc vô nghĩa ("this throwing", "inversible affluence", "fry information", "as tilting is very good"), '
  + 'khiến người nghe không hiểu em muốn nói gì. Ngoài ra em lặp \'very\' 5 lần, \'also\' 3 lần và dùng sai dạng từ ở 3 chỗ '
  + '("convenience", "quick", "many information"). Để lên band 5, em cần làm hai việc: (1) khi quên từ, diễn đạt lại bằng từ đơn giản '
  + 'mình chắc nghĩa thay vì đọc cụm không hiểu — ví dụ nói "the battery runs out fast" thay cho "as tilting is very good"; '
  + '(2) học sẵn 5–6 collocation cố định cho chủ đề điện thoại ("check messages", "scroll through social media") '
  + 'và dùng đúng dạng từ ("convenient", "quickly", "a lot of information").'

describe('commentBlocks', () => {
  it('splits a long one-line comment into a paragraph per sentence and a numbered list for the "(1) (2)" changes', () => {
    const blocks = commentBlocks(ONE_LINE)

    expect(blocks.map((block) => block.kind)).toEqual(['p', 'p', 'p', 'list'])
    expect(blocks[0]).toMatchObject({ text: expect.stringMatching(/^Điểm giữ em ở band 4 là LR:.*không hiểu em muốn nói gì\.$/) })
    expect(blocks[1]).toMatchObject({ text: expect.stringMatching(/^Ngoài ra em lặp 'very' 5 lần.*"many information"\)\.$/) })
    expect(blocks[2]).toEqual({ kind: 'p', text: 'Để lên band 5, em cần làm hai việc:' })
    const list = blocks[3] as { kind: 'list'; items: string[] }
    expect(list.items).toHaveLength(2)
    expect(list.items[0]).toMatch(/^khi quên từ, diễn đạt lại.*as tilting is very good"$/)
    expect(list.items[1]).toMatch(/^học sẵn 5–6 collocation.*a lot of information"\)\.$/)
  })

  it('keeps the model\'s own layout: blank lines between paragraphs and one list item per numbered line', () => {
    const text = 'Em đang ở band 4 vì dùng từ sai nghĩa.\n\nNgoài ra em lặp "very" 5 lần.\n\nĐể lên band 5, em cần:\n1. diễn đạt lại bằng từ đơn giản\n2. học sẵn 5 collocation'

    expect(commentBlocks(text)).toEqual([
      { kind: 'p', text: 'Em đang ở band 4 vì dùng từ sai nghĩa.' },
      { kind: 'p', text: 'Ngoài ra em lặp "very" 5 lần.' },
      { kind: 'p', text: 'Để lên band 5, em cần:' },
      { kind: 'list', items: ['diễn đạt lại bằng từ đơn giản', 'học sẵn 5 collocation'] },
    ])
  })

  it('leaves a short comment as one paragraph, even when it has two sentences', () => {
    expect(commentBlocks('Câu còn ngắn. Từ nối cơ bản.')).toEqual([{ kind: 'p', text: 'Câu còn ngắn. Từ nối cơ bản.' }])
  })

  it('does not break a sentence at a full stop that is not followed by a capital letter', () => {
    const text = `${'Em nói được ý chính, '.repeat(14)}ví dụ "Mr. smith" chưa tự nhiên. ${'x'.repeat(10)}`

    expect(commentBlocks(text).filter((block) => block.kind === 'p').length).toBeLessThanOrEqual(1)
  })

  it('returns nothing for an empty text', () => {
    expect(commentBlocks('')).toEqual([])
    expect(commentBlocks('  \n ')).toEqual([])
  })
})
