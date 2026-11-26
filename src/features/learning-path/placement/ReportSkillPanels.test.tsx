import { render, screen } from '@/test/render'
import { describe, expect, it } from 'vitest'
import { SpeakingReport } from './ReportSkillPanels'

describe('Speaking placement report', () => {
  it('shows the actual grade and feedback without the ungraded notice', () => {
    render(<SpeakingReport band={6.5} feedback={{
      summary: 'Bạn duy trì câu trả lời rõ ràng.',
      criteria: [{ code: 'FC', band: 7, comment: 'Mạch nói khá tự nhiên.' }],
    }} />)

    expect(screen.getByText('6.5')).toBeInTheDocument()
    expect(screen.getByText('Bạn duy trì câu trả lời rõ ràng.')).toBeInTheDocument()
    expect(screen.getByText('Mạch nói khá tự nhiên.')).toBeInTheDocument()
    expect(screen.queryByText(/Hệ thống chưa chấm bản ghi Speaking/)).not.toBeInTheDocument()
  })

  it('keeps the existing guidance when no speaking grade is available', () => {
    render(<SpeakingReport band={5.5} feedback={null} />)
    expect(screen.getByText(/Hệ thống chưa chấm bản ghi Speaking/)).toBeInTheDocument()
    expect(screen.getByText('Fluency & Coherence')).toBeInTheDocument()
  })
})
