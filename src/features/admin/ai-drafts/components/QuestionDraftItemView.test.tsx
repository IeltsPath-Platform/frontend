import { render, screen, within } from '@/test/render'
import { describe, expect, it } from 'vitest'
import type { QuestionDraftItem } from '../types'
import { QuestionDraftItemView } from './QuestionDraftItemView'

const choice: QuestionDraftItem = {
  stem: 'Which statement matches the passage?', difficulty: 'MEDIUM', explanation: 'The first paragraph supports B.',
  options: [{ optionKey: 'B', content: 'The supported statement', sortOrder: 2 }, { optionKey: 'A', content: 'The incorrect statement', sortOrder: 1 }],
  answerSpec: { type: 'CHOICE', correct: 'B', distractors: { A: 'READING_INFERENCE' } },
}
const fill: QuestionDraftItem = {
  stem: 'Complete the answer.', difficulty: 'HARD', explanation: 'Both spellings are accepted.', options: [],
  answerSpec: { type: 'FILL', accepted: ['colour', 'color'], maxWords: 2 },
}

describe('QuestionDraftItemView', () => {
  it('lists the options in order, marks the correct one and names the error code of a wrong one', () => {
    render(<QuestionDraftItemView item={choice} />)
    const options = within(screen.getByRole('list', { name: 'Lựa chọn' })).getAllByRole('listitem')
    expect(options[0]).toHaveTextContent('AThe incorrect statement')
    expect(options[0]).toHaveTextContent('Mã lỗi READING_INFERENCE')
    expect(options[1]).toHaveTextContent('BThe supported statement')
    expect(options[1]).toHaveTextContent('Đáp án đúng')
    expect(options[1]).toHaveClass('is-correct')
    expect(screen.getByRole('region', { name: 'Giải thích' })).toHaveTextContent('The first paragraph supports B.')
  })

  it('shows every accepted typed answer and the word limit', () => {
    render(<QuestionDraftItemView item={fill} />)
    const accepted = screen.getByRole('region', { name: 'Đáp án được chấp nhận' })
    expect(within(accepted).getByText('colour')).toBeInTheDocument()
    expect(within(accepted).getByText('color')).toBeInTheDocument()
    expect(within(accepted).getByText('Tối đa 2 từ')).toBeInTheDocument()
  })

  it('renders the stem and explanation as plain text', () => {
    render(<QuestionDraftItemView item={{ ...choice, stem: '<b>bold</b>', explanation: '<script>x</script>' }} />)
    expect(screen.getByText('<b>bold</b>')).toBeInTheDocument()
    expect(screen.getByText('<script>x</script>')).toBeInTheDocument()
  })
})
