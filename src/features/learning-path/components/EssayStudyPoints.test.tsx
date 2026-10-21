import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { EssayStudyPoint } from '~types/learningPath'
import { ApiError } from '../api'
import { EssayStudyPoints } from './EssayStudyPoints'

const criterion: EssayStudyPoint = {
  kind: 'CRITERION', criterionCode: 'CC', band: 5.5, knowledgePointId: 'kp-1',
  code: 'DEMO_WRITING_CRITERION_CC', name: 'Mạch lạc và liên kết (CC)', title: null,
  reason: 'Chia đoạn hợp lý và nối các ý rõ ràng.',
}
const ai: EssayStudyPoint = {
  kind: 'AI', criterionCode: null, band: null, knowledgePointId: null,
  code: null, name: null, title: 'Cohesive Devices', reason: 'Use transitions naturally.',
}

describe('EssayStudyPoints', () => {
  it('renders nothing when there are no points', () => {
    render(<EssayStudyPoints points={[]} />)
    expect(screen.queryByRole('heading', { name: 'Kiến thức cần học' })).not.toBeInTheDocument()
  })

  it('shows a criterion name, band, reason and practice action', () => {
    render(<EssayStudyPoints points={[criterion]} onPractise={vi.fn()} />)
    expect(screen.getByText(criterion.name!)).toBeInTheDocument()
    expect(screen.getByText('Coherence & Cohesion · band 5.5')).toBeInTheDocument()
    expect(screen.getByText(criterion.reason!)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: `Luyện tập ${criterion.name}` })).toHaveAttribute('type', 'button')
  })

  it('falls back to the readable criterion when its name and title are missing', () => {
    render(<EssayStudyPoints points={[{ ...criterion, name: null }]} />)
    expect(screen.getByText('Coherence & Cohesion', { selector: 'strong' })).toBeInTheDocument()
  })

  it('shows AI suggestions as text without a practice action or a band', () => {
    render(<EssayStudyPoints points={[{ ...ai, knowledgePointId: 'ignored-kp' }]} onPractise={vi.fn()} />)
    expect(screen.getByText(ai.title!)).toBeInTheDocument()
    expect(screen.getByText(ai.reason!)).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    expect(screen.queryByText(/band/)).not.toBeInTheDocument()
  })

  it('has no practice action without a callback or knowledge point', () => {
    const { rerender } = render(<EssayStudyPoints points={[criterion]} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    rerender(<EssayStudyPoints points={[{ ...criterion, knowledgePointId: null }]} onPractise={vi.fn()} />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('starts practice once and disables the button while it is opening', async () => {
    let resolve!: () => void
    const onPractise = vi.fn(() => new Promise<void>((done) => { resolve = done }))
    render(<EssayStudyPoints points={[criterion]} onPractise={onPractise} />)
    const button = screen.getByRole('button', { name: `Luyện tập ${criterion.name}` })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(onPractise).toHaveBeenCalledExactlyOnceWith(criterion)
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('Đang mở…')
    await act(async () => { resolve() })
  })

  it('shows a refusal under its own point and allows retrying', async () => {
    const onPractise = vi.fn().mockRejectedValueOnce(new ApiError(409, 'FREE_PRACTICE_EXHAUSTED', 'exhausted'))
      .mockResolvedValueOnce(undefined)
    render(<EssayStudyPoints points={[criterion, { ...criterion, knowledgePointId: 'kp-2', name: 'Other point' }]} onPractise={onPractise} />)
    const button = screen.getByRole('button', { name: `Luyện tập ${criterion.name}` })
    await userEvent.click(button)
    expect(await within(button.closest('li')!).findByRole('alert')).toHaveTextContent('Đã hết bộ luyện tự do')
    expect(within(screen.getByText('Other point').closest('li')!).queryByRole('alert')).not.toBeInTheDocument()
    expect(button).toBeEnabled()
    await userEvent.click(button)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(onPractise).toHaveBeenCalledTimes(2)
  })

  it('shows an AI suggestion about a listed criterion under that criterion instead of as a separate entry', () => {
    const lexical: EssayStudyPoint = { ...criterion, criterionCode: 'LR', name: 'Vốn từ vựng (LR)', knowledgePointId: 'kp-lr' }
    const generic: EssayStudyPoint = { ...ai, title: 'Lexical Resource', reason: 'Học từ vựng chuẩn cho Task 1.' }
    const specific: EssayStudyPoint = { ...ai, title: 'Vocabulary range', reason: 'Vary the verbs for change.' }
    render(<EssayStudyPoints points={[lexical, generic, specific]} onPractise={vi.fn()} />)
    const item = screen.getByText('Vốn từ vựng (LR)').closest('li')!
    expect(within(item).getByText('Học từ vựng chuẩn cho Task 1.')).toBeInTheDocument()
    expect(within(item).getByText('Vocabulary range: Vary the verbs for change.')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
    expect(screen.queryByText('Lexical Resource', { selector: 'strong' })).not.toBeInTheDocument()
  })

  it('keeps an AI suggestion on its own when no listed criterion matches it', () => {
    render(<EssayStudyPoints points={[criterion, { ...ai, title: 'Grammar range', reason: 'Use complex sentences.' }]} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('Grammar range')).toBeInTheDocument()
  })

  it('renders server content as plain text', () => {
    const { container } = render(<EssayStudyPoints points={[{ ...ai, title: '<b>Title</b>', reason: '<img src=x onerror=alert(1)>' }]} />)
    expect(screen.getByText('<b>Title</b>')).toBeInTheDocument()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(container.querySelector('b, img')).toBeNull()
  })
})
