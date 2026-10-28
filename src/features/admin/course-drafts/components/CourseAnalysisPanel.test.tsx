import { render, screen, within } from '@/test/render'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { CourseAnalysis } from '../types'
import { CourseAnalysisPanel } from './CourseAnalysisPanel'

const knowledgePointId = '11111111-1111-4111-8111-111111111111'
const analysis: CourseAnalysis = {
  valid: false,
  errors: [{ code: 'PREREQUISITE_ORDER', subject: knowledgePointId, related: 'prerequisite-id' }],
  warnings: [{ code: 'KP_NOT_COVERED', subject: 'missing-kp', related: null }],
  gaps: [{ knowledgePointId, reason: 'NO_EXERCISE_QUESTION' }], coverage: { expected: 12, covered: 9 },
}

describe('CourseAnalysisPanel', () => {
  it('separates blocking errors, warnings and gaps and shows prerequisite references', () => {
    render(<MemoryRouter><CourseAnalysisPanel analysis={analysis} /></MemoryRouter>)
    expect(screen.getByText('Đã phủ 9/12 điểm kiến thức cần có.')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Lỗi chặn duyệt' })).getByText('prerequisite-id')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Cảnh báo' })).getByText('missing-kp')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: 'Thiếu nội dung trong kho' })).getByText(knowledgePointId)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Sinh thêm câu cho KP này' })).not.toBeInTheDocument()
  })

  it('links enabled gap actions to the prefilled question draft form', () => {
    render(<MemoryRouter><CourseAnalysisPanel analysis={analysis} questionDraftsEnabled /></MemoryRouter>)
    expect(screen.getByRole('link', { name: 'Sinh thêm câu cho KP này' })).toHaveAttribute('href', `/content-author/ai-drafts?new=questions&knowledgePointId=${knowledgePointId}`)
  })

  it('shows unmatched topics and model warnings as safe text', () => {
    render(<MemoryRouter><CourseAnalysisPanel analysis={{ ...analysis, errors: [], valid: true }} unmatchedTopics={['<script>topic</script>']} warnings={[{ code: 'HALLUCINATED_REFERENCE', subject: 'UNKNOWN_REF' }]} /></MemoryRouter>)
    expect(screen.getByText('Không có lỗi chặn trong lần phân tích này.')).toBeInTheDocument()
    expect(screen.getByText('<script>topic</script>')).toBeInTheDocument()
    expect(screen.getByText('UNKNOWN_REF')).toBeInTheDocument()
    expect(screen.queryByRole('script')).not.toBeInTheDocument()
  })
})
