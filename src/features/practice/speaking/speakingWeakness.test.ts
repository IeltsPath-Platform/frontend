import { describe, expect, it } from 'vitest'
import { parseWeakness, tokenize } from './speakingWeakness'

const quotes = (tokens: { kind: string; text: string }[]) => tokens.filter((token) => token.kind === 'quote').map((token) => token.text)

/** Weaknesses as the grader writes them in the form the prompt asks for. */
const VOCAB = 'Từ vựng vô nghĩa hoặc bị dùng sai nghĩa xuất hiện ở 4 chỗ trong Part 2: "this throwing", "inversible affluence", '
  + '"fry information", "as tilting is very good". Người nghe không đoán được nghĩa, đây là lỗi nặng nhất. Sửa: nói "this phone", '
  + '"I don\'t play football well", "find information", "the battery drains quickly". Quy tắc: khi không nhớ từ, hãy diễn đạt lại '
  + 'bằng từ đơn giản mà mình chắc nghĩa, đừng đọc một cụm mình không hiểu.'
const FORM = 'Sai dạng từ ở 3 chỗ: "my life convenience" (cần \'convenient\'), "very quick" (cần \'quickly\'), "many information" '
  + '(information không đếm được, cần \'a lot of information\'). Sửa: "makes my life more convenient", "very quickly", "a lot of '
  + 'information". Quy tắc: tính từ bổ nghĩa danh từ, trạng từ bổ nghĩa động từ; danh từ không đếm được không đi với \'many\'.'

describe('parseWeakness with the labels', () => {
  it('splits a weakness into its title, the wrong words, the fix and the rule', () => {
    const view = parseWeakness(VOCAB)

    expect(view.title).toBe('Từ vựng vô nghĩa hoặc bị dùng sai nghĩa xuất hiện ở 4 chỗ trong Part 2')
    expect(quotes(view.body)).toEqual(['this throwing', 'inversible affluence', 'fry information', 'as tilting is very good'])
    expect(view.body.at(-1)).toEqual({ kind: 'text', text: 'Người nghe không đoán được nghĩa, đây là lỗi nặng nhất.' })
    expect(quotes(view.fix)).toEqual(['this phone', "I don't play football well", 'find information', 'the battery drains quickly'])
    expect(view.rule).toEqual([{ kind: 'text', text: 'khi không nhớ từ, hãy diễn đạt lại bằng từ đơn giản mà mình chắc nghĩa, đừng đọc một cụm mình không hiểu.' }])
    expect(view.practice).toEqual([])
  })

  it('keeps the words around a quote in order, such as the hint in brackets after it', () => {
    const view = parseWeakness(FORM)

    expect(view.title).toBe('Sai dạng từ ở 3 chỗ')
    expect(view.body.map((token) => token.text)).toEqual([
      'my life convenience', "(cần 'convenient')", 'very quick', "(cần 'quickly')", 'many information',
      "(information không đếm được, cần 'a lot of information').",
    ])
    expect(quotes(view.fix)).toEqual(['makes my life more convenient', 'very quickly', 'a lot of information'])
    expect(view.rule[0].text).toContain('danh từ không đếm được không đi với')
  })

  it('reads the practice step and a fix that starts with words before its quote', () => {
    const view = parseWeakness('Câu lạc đề ở 2 chỗ: "Eating piece there" và "My favorite subject is English". Sửa: bỏ các câu này, '
      + 'thay bằng "Another reason I use it every day". Quy tắc: mỗi câu phải trả lời trực tiếp câu hỏi. Luyện: viết lại 3 câu mỗi ngày.')

    expect(view.fix.map((token) => token.kind)).toEqual(['text', 'quote'])
    expect(view.fix[0].text).toBe('bỏ các câu này, thay bằng')
    expect(view.practice).toEqual([{ kind: 'text', text: 'viết lại 3 câu mỗi ngày.' }])
  })

  it('takes the first sentence as the title when there is no colon before the quotes', () => {
    const view = parseWeakness('Hay lặp từ. Có 5 chỗ như "very good" và "very big". Sửa: "really good". Quy tắc: đổi từ.')

    expect(view.title).toBe('Hay lặp từ.')
    expect(quotes(view.body)).toEqual(['very good', 'very big'])
  })

  it('does not mistake a lower-case "sửa" or the middle of a word for a label', () => {
    expect(parseWeakness('Em hay nhờ sửa: nhưng chưa tự sửa lỗi.').fix).toEqual([])
  })
})

describe('parseWeakness without the labels (feedback stored before they were asked for)', () => {
  it('cuts the title at the colon and keeps the rest as the body', () => {
    const view = parseWeakness('Lạc đề và lan man: Có 4 câu nói lạc sang các chủ đề khác (hải sản, môn toán) làm người nghe mất mạch.')

    expect(view.title).toBe('Lạc đề và lan man')
    expect(view.body).toEqual([{ kind: 'text', text: 'Có 4 câu nói lạc sang các chủ đề khác (hải sản, môn toán) làm người nghe mất mạch.' }])
    expect(view.fix).toEqual([])
    expect(view.rule).toEqual([])
  })

  it("cuts the title at the bracket and turns the 'single quoted' examples into chips", () => {
    const view = parseWeakness("Lỗi lặp lại về việc thiếu chia động từ ngôi thứ ba số ít (ví dụ: 'he live', 'he work', 'he help').")

    expect(view.title).toBe('Lỗi lặp lại về việc thiếu chia động từ ngôi thứ ba số ít')
    expect(view.body).toEqual([
      { kind: 'quote', text: 'he live' }, { kind: 'quote', text: 'he work' }, { kind: 'quote', text: 'he help' },
    ])
  })

  it('has no title and shows everything as the body when there is nowhere to cut one', () => {
    const view = parseWeakness("Dùng từ vựng quá đơn giản và lặp lại các từ như 'very', 'good', 'help'.")

    expect(view.title).toBe('')
    expect(view.body.map((token) => token.text)).toEqual(['Dùng từ vựng quá đơn giản và lặp lại các từ như', 'very', 'good', 'help'])
    expect(parseWeakness('Chưa dùng câu phức')).toEqual({
      title: '', body: [{ kind: 'text', text: 'Chưa dùng câu phức' }], fix: [], rule: [], practice: [],
    })
  })

  it('leaves an apostrophe inside a word alone', () => {
    expect(tokenize("Nói sai ở chỗ don't và can't.")).toEqual([{ kind: 'text', text: "Nói sai ở chỗ don't và can't." }])
  })
})

describe('tokenize', () => {
  it('drops the quotation marks of a quote and leaves the rest', () => {
    expect(tokenize('nói "this phone" và “a lot of information”.')).toEqual([
      { kind: 'text', text: 'nói' }, { kind: 'quote', text: 'this phone' }, { kind: 'text', text: 'và' },
      { kind: 'quote', text: 'a lot of information' },
    ])
    expect(tokenize('')).toEqual([])
  })
})
