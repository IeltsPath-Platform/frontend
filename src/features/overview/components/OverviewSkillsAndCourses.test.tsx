import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { LearnerReportSummary, ReportKnowledgePoint } from '../api/overviewApi'
import { OverviewSkillsAndCourses } from './OverviewSkillsAndCourses'

const idle = { loading: false, error: null, reload: vi.fn() }
const course = (id: string, name: string, bandLevel: number, completedLessons: number, totalLessons: number, percent: number | null = null) => ({ id, name, bandLevel, percent, completedLessons, totalLessons, startedAt: null })
const point = (skill: string, band: number, mastery: number, evidenceCount = 3, tier = 'MAINTAIN'): ReportKnowledgePoint => ({ skill, band, score: { mastery, tier, evidenceCount } })

function report(bands: Record<string, number | null>, knowledgePoints: ReportKnowledgePoint[], target: number | null = 8): LearnerReportSummary {
  return {
    knowledgePoints,
    skills: Object.entries(bands).map(([skill, band]) => ({ skill, band, mastery: null, kpCount: 5, tierCounts: {} })),
    estimatedBand: { value: 6, estimated: true },
    target: target === null ? null : { targetBand: target, gap: null, examDate: null },
    placementBand: 5,
  }
}

const points = [
  point('LISTENING', 7, 0.8), point('READING', 7, 0.6), point('WRITING', 7, 0.3), point('SPEAKING', 7, 0.5),
  point('LISTENING', 6, 0.9), point('READING', 6, 0.9),
]
const courses = [course('seven', 'IELTS 7.0', 7, 2, 14, 14), course('six', 'IELTS 6.0', 6, 4, 29), course('eight', 'IELTS 8.0', 8, 1, 6)]
const bands = { LISTENING: 6.5, READING: 7, WRITING: 5.5, SPEAKING: 6 }

function renderBlocks(props: Partial<React.ComponentProps<typeof OverviewSkillsAndCourses>> = {}) {
  const data = props.report === undefined ? report(bands, points) : props.report
  return render(
    <MemoryRouter>
      <OverviewSkillsAndCourses report={data} courses={courses} reportSource={idle} courseSource={idle} {...props} />
    </MemoryRouter>,
  )
}
const skillBlock = () => screen.getByRole('region', { name: 'Kỹ năng theo khóa' })

describe('OverviewSkillsAndCourses', () => {
  it('opens on the most recent course with the mastery of each skill in it', () => {
    renderBlocks()
    const block = skillBlock()
    expect(within(block).getByRole('button', { name: 'IELTS 7.0' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(block).getByText(/Khóa band/)).toHaveTextContent('Khóa band 7.0')
    expect(within(within(block).getByText('Listening').closest('li')!).getByText('80%')).toBeVisible()
    expect(within(within(block).getByText('Writing').closest('li')!).getByText('30%')).toBeVisible()
  })

  it('names the weakest skill of the chosen course in text', () => {
    renderBlocks()
    const writing = within(skillBlock()).getByText('Writing').closest('li')!
    expect(within(writing).getByText('Cần ưu tiên')).toBeVisible()
    expect(within(skillBlock()).getAllByText('Cần ưu tiên')).toHaveLength(1)
  })

  it('switches to another course and shows its own skills, leaving out those it has no points for', async () => {
    renderBlocks()
    await userEvent.click(within(skillBlock()).getByRole('button', { name: 'IELTS 6.0' }))
    const block = skillBlock()
    expect(within(block).getByRole('button', { name: 'IELTS 6.0' })).toHaveAttribute('aria-pressed', 'true')
    expect(within(within(block).getByText('Listening').closest('li')!).getByText('90%')).toBeVisible()
    expect(within(within(block).getByText('Writing').closest('li')!).getByText('—')).toBeVisible()
  })

  it('says so when the chosen course has no judged skill yet', async () => {
    renderBlocks()
    await userEvent.click(within(skillBlock()).getByRole('button', { name: 'IELTS 8.0' }))
    expect(within(skillBlock()).getByText('Chưa có kỹ năng nào được đánh giá trong khóa này.')).toBeVisible()
    expect(within(skillBlock()).queryByRole('list')).not.toBeInTheDocument()
  })

  it('ignores points with too little evidence when averaging a skill', async () => {
    const data = report(bands, [point('LISTENING', 7, 0.9, 5), point('LISTENING', 7, 0.1, 1, 'INSUFFICIENT'), point('READING', 7, 0.5)])
    renderBlocks({ report: data })
    expect(within(within(skillBlock()).getByText('Listening').closest('li')!).getByText('90%')).toBeVisible()
  })

  it('has no overall band choice', () => {
    renderBlocks()
    expect(within(skillBlock()).queryByRole('button', { name: /tổng hợp/i })).not.toBeInTheDocument()
    expect(within(skillBlock()).queryByText(/Mục tiêu/)).not.toBeInTheDocument()
  })

  it('does not show the loading line while a reload runs over data already shown', () => {
    renderBlocks({ reportSource: { loading: true, error: null, reload: vi.fn() } })
    expect(screen.queryByText('Đang tải dữ liệu…')).not.toBeInTheDocument()
    expect(within(skillBlock()).getByText('Writing')).toBeVisible()
  })

  it('hides the skill block when the report has no course point', () => {
    renderBlocks({ report: report({}, []) })
    expect(screen.queryByRole('region', { name: 'Kỹ năng theo khóa' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Các khóa đang học' })).toBeVisible()
  })

  it('lists every course with lesson progress, linking to each course', () => {
    const many = [...courses, course('five', 'IELTS 5.0', 5, 2, 26), course('four', 'IELTS 4.0', 4, 0, 10)]
    renderBlocks({ courses: many })
    const list = within(screen.getByRole('region', { name: 'Các khóa đang học' }))
    expect(list.getAllByRole('link')).toHaveLength(5)
    expect(list.getByRole('link', { name: 'IELTS 6.0: hoàn thành 4/29 bài' })).toHaveAttribute('href', '/learn/courses/six')
  })

  it('hides the course block when there is no course', () => {
    renderBlocks({ courses: [] })
    expect(screen.queryByRole('region', { name: 'Các khóa đang học' })).not.toBeInTheDocument()
  })

  it('offers a retry when the course request fails', () => {
    const reload = vi.fn()
    renderBlocks({ courses: [], courseSource: { loading: false, error: 'boom', reload } })
    screen.getByRole('button', { name: 'Thử lại' }).click()
    expect(reload).toHaveBeenCalled()
  })
})
