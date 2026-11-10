import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { VocabularyMapResponse } from '@/features/vocabulary/api/notebookApi'
import { DetailedVocabularyMap } from './DetailedVocabularyMap'

const level = (cefr: string, band: string, total: number, learned = 0, learning = 0, needsReview = 0) => ({ cefr, band, total, learned, learning, needsReview, notLearned: total - learned })
const empty: VocabularyMapResponse = {
  bands: [level('A1', '1.0–2.5', 142), level('A2', '3.0–3.5', 156), level('B1', '4.0–5.0', 172), level('B2', '5.5–6.5', 181)],
  currentBand: null,
  suggestedBand: null,
}
const mount = (ui: React.ReactElement) => render(<MemoryRouter>{ui}</MemoryRouter>)

describe('DetailedVocabularyMap', () => {
  it('draws one horizontal row per level with the learned share', () => {
    const data = { ...empty, bands: [level('A1', '1.0–2.5', 100, 25, 10, 4), level('A2', '3.0–3.5', 50)], currentBand: 'A1', suggestedBand: 'A1' }
    mount(<DetailedVocabularyMap data={data} />)
    const meter = screen.getByRole('progressbar', { name: /A1, IELTS 1.0–2.5/ })
    expect(meter).toHaveAttribute('aria-valuenow', '25')
    expect(meter).toHaveAttribute('aria-valuemax', '100')
    expect(meter.firstElementChild).toHaveStyle({ width: '25%' })
    expect(screen.getByText('25 / 100 nghĩa')).toBeInTheDocument()
    expect(screen.getByText('10 đang học · 4 cần ôn')).toBeInTheDocument()
    expect(screen.getByText('Đang học ở đây')).toBeInTheDocument()
  })
  it('counts meanings, not words, and says which catalog the levels cover', () => {
    mount(<DetailedVocabularyMap data={{ ...empty, bands: [level('A1', '1.0–2.5', 100, 25)] }} />)
    expect(screen.getByText('25', { selector: 'strong' }).parentElement).toHaveTextContent('Đã học 25 / 100 nghĩa')
    expect(screen.getByText(/Mỗi nghĩa của một từ được đếm riêng/)).toBeInTheDocument()
    expect(screen.getByText(/kho từ của IELTS Space/)).toBeInTheDocument()
  })
  it('prints the visible counts so nothing depends on a hover tooltip', () => {
    const { container } = mount(<DetailedVocabularyMap data={{ ...empty, bands: [level('A1', '1.0–2.5', 100, 25, 10, 4)] }} />)
    expect(container.querySelector('[title]')).not.toBeInTheDocument()
  })
  it('invites a learner with no learned words to start at the level for their band', () => {
    mount(<DetailedVocabularyMap data={empty} learnerBand={4} />)
    expect(screen.getByText(/Bạn chưa học từ nào/)).toBeInTheDocument()
    expect(screen.getAllByText('B1 · IELTS 4.0–5.0', { selector: 'strong' })).toHaveLength(2)
    expect(screen.getByRole('link', { name: /Chọn bộ từ vựng/ })).toHaveAttribute('href', '/vocabulary')
    expect(screen.getByText('theo band của bạn')).toBeInTheDocument()
  })
  it('keeps the level from the words being learned over the learner band', () => {
    mount(<DetailedVocabularyMap data={{ ...empty, bands: [level('A1', '1.0–2.5', 100, 10, 5), level('B1', '4.0–5.0', 100)], currentBand: 'A1' }} learnerBand={4.5} />)
    expect(screen.queryByText('theo band của bạn')).not.toBeInTheDocument()
    expect(screen.getByText('A1 · IELTS 1.0–2.5', { selector: 'strong' })).toBeInTheDocument()
  })
  it('marks the level of the target band', () => {
    mount(<DetailedVocabularyMap data={empty} targetBand={6.5} />)
    expect(screen.getByText('B2 · IELTS 5.5–6.5', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.getAllByText('Mục tiêu').some((node) => node.className.includes('detailed-level-badge'))).toBe(true)
  })
  it('does not invent a level or a start prompt without a band, and handles an empty catalog', () => {
    mount(<DetailedVocabularyMap data={{ bands: [], currentBand: null, suggestedBand: null }} />)
    expect(screen.getByText('Chưa xác định')).toBeInTheDocument()
    expect(screen.getByText(/Chưa có từ vựng trong kho/)).toBeInTheDocument()
    expect(screen.queryByText(/Bạn chưa học từ nào/)).not.toBeInTheDocument()
  })
})
