import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { EssayKnowledgeJudgment } from '~types/learningPath'
import { EssayTaskJudgments } from './EssayTaskJudgments'

const judgments: EssayKnowledgeJudgment[] = [
  { knowledgePointId: 'kp-1', code: 'TOPIC', name: 'Câu chủ đề', judgment: 'FAIL', excerpt: 'Trees are good.', reason: 'Thiếu ý chính.' },
  { knowledgePointId: 'kp-2', code: 'OPINION', name: null, judgment: 'PASS', excerpt: 'I agree with this view.', reason: null },
  { knowledgePointId: 'kp-3', code: null, name: null, judgment: 'NOT_ASSESSED', excerpt: null, reason: null },
]

describe('EssayTaskJudgments', () => {
  it('renders nothing when the question has no knowledge points', () => {
    const { container } = render(<EssayTaskJudgments judgments={[]} />)
    expect(container).toBeEmptyDOMElement()
    expect(render(<EssayTaskJudgments judgments={undefined} />).container).toBeEmptyDOMElement()
  })

  it('shows each point with its verdict, the quoted sentence and the reason', () => {
    render(<EssayTaskJudgments judgments={judgments} />)
    expect(screen.getByRole('heading', { name: 'Kiến thức của đề bài' })).toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(within(items[0]!).getByText('Câu chủ đề')).toBeInTheDocument()
    expect(within(items[0]!).getByText('Cần luyện')).toBeInTheDocument()
    expect(within(items[0]!).getByText('Trees are good.')).toBeInTheDocument()
    expect(within(items[0]!).getByText('Thiếu ý chính.')).toBeInTheDocument()
    expect(within(items[1]!).getByText('OPINION')).toBeInTheDocument()
    expect(within(items[1]!).getByText('Đạt')).toBeInTheDocument()
    expect(within(items[2]!).getByText('Điểm kiến thức')).toBeInTheDocument()
    expect(within(items[2]!).getByText('Chưa đủ bằng chứng')).toBeInTheDocument()
  })

  it('renders server text as plain text', () => {
    const { container } = render(<EssayTaskJudgments judgments={[{ ...judgments[0]!, reason: '<img src=x onerror=alert(1)>' }]} />)
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
