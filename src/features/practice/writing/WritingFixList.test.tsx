import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { WritingCorrection } from './writingApi'
import { WritingFixList } from './WritingFixList'

const fix = (overrides: Partial<WritingCorrection>): WritingCorrection => ({
  excerpt: 'It have', suggestion: 'It has', category: 'GRAMMAR', certainty: 'ERROR', reason: 'Chủ ngữ số ít nên động từ phải là has.', errorName: 'Sai hòa hợp chủ ngữ và động từ', ...overrides,
})

const corrections: WritingCorrection[] = [
  fix({}),
  fix({ excerpt: 'five age group', suggestion: 'five age groups', reason: 'Sau số lớn hơn một cần danh từ số nhiều.' }),
  fix({ excerpt: 'going library', suggestion: 'going to the library', category: 'VOCABULARY', errorName: 'Sai giới từ', reason: 'Thiếu giới từ to.' }),
  fix({ excerpt: 'because reading is good', suggestion: '', category: 'TASK', errorName: 'Nêu ý kiến không có trong biểu đồ', reason: 'Task 1 chỉ mô tả biểu đồ.' }),
  fix({ excerpt: 'the number of people', suggestion: 'the number of visitors', certainty: 'SUGGESTION', category: 'VOCABULARY', reason: undefined }),
]

const cards = () => within(screen.getByRole('list')).getAllByRole('listitem')

describe('the list of mistakes to fix', () => {
  it('counts mistakes apart from suggestions and shows every card with what was written, what it should be and why', () => {
    render(<MemoryRouter><WritingFixList corrections={corrections} /></MemoryRouter>)

    expect(screen.getByText('4 lỗi · 1 gợi ý diễn đạt')).toBeInTheDocument()
    expect(cards()).toHaveLength(5)
    expect(cards()[0]).toHaveTextContent('It have')
    expect(cards()[0]).toHaveTextContent('It has')
    expect(cards()[0]).toHaveTextContent('Chủ ngữ số ít nên động từ phải là has.')
    expect(cards()[0]).toHaveTextContent('Sai hòa hợp chủ ngữ và động từ')
  })

  it('says a passage is to be removed, and calls a suggestion by its name instead of an error', () => {
    render(<MemoryRouter><WritingFixList corrections={corrections} /></MemoryRouter>)

    expect(cards()[3]).toHaveTextContent('Bỏ đoạn này')
    expect(cards()[4]).toHaveTextContent('Gợi ý')
    expect(cards()[4]).toHaveTextContent('Câu vẫn đúng')
  })

  it('narrows the cards to one category and keeps each card its number in the essay', () => {
    render(<MemoryRouter><WritingFixList corrections={corrections} /></MemoryRouter>)

    fireEvent.click(screen.getByRole('button', { name: /^Từ vựng\s*2$/ }))

    expect(cards()).toHaveLength(2)
    expect(within(cards()[0]).getByLabelText('Lỗi 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^Từ vựng\s*2$/ })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /^Tất cả\s*5$/ }))
    expect(cards()).toHaveLength(5)
  })

  it('scrolls to the card of the mark the learner picked and highlights it, and again when the same mark is picked again', () => {
    const scroll = vi.fn()
    Element.prototype.scrollIntoView = scroll
    const { rerender } = render(<MemoryRouter><WritingFixList active={null} corrections={corrections} /></MemoryRouter>)
    expect(scroll).not.toHaveBeenCalled()

    rerender(<MemoryRouter><WritingFixList active={{ number: 2, tick: 1 }} corrections={corrections} /></MemoryRouter>)

    expect(scroll).toHaveBeenCalledTimes(1)
    expect(cards()[1]).toHaveClass('is-active')
    expect(cards()[0]).not.toHaveClass('is-active')

    rerender(<MemoryRouter><WritingFixList active={{ number: 2, tick: 2 }} corrections={corrections} /></MemoryRouter>)
    expect(scroll).toHaveBeenCalledTimes(2)
  })

  it('shows every category again when the picked mark belongs to a category the filter hides', () => {
    Element.prototype.scrollIntoView = vi.fn()
    const { rerender } = render(<MemoryRouter><WritingFixList active={null} corrections={corrections} /></MemoryRouter>)
    fireEvent.click(screen.getByRole('button', { name: /^Từ vựng\s*2$/ }))
    expect(cards()).toHaveLength(2)

    rerender(<MemoryRouter><WritingFixList active={{ number: 1, tick: 1 }} corrections={corrections} /></MemoryRouter>)

    expect(cards()).toHaveLength(5)
    expect(cards()[0]).toHaveClass('is-active')
    expect(screen.getByRole('button', { name: /^Tất cả\s*5$/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('offers "Tất cả" and the one category when every card is of the same category', () => {
    render(<MemoryRouter><WritingFixList corrections={[fix({}), fix({ excerpt: 'x' })]} /></MemoryRouter>)

    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
