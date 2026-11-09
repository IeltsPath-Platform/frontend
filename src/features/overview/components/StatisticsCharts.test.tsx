import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { BandPoint } from '../api/overviewApi'
import { BandHistoryChart, SkillCompletionChart } from './StatisticsCharts'

describe('detailed statistics charts', () => {
  it('does not draw a complete radar when a skill has no published lessons', () => {
    const { container } = render(<SkillCompletionChart skills={[{ skill: 'READING', completedLessons: 0, totalLessons: 0, percent: null }, { skill: 'LISTENING', completedLessons: 2, totalLessons: 4, percent: 50 }]} />)
    expect(container.querySelector('.statistics-radar-fill')).not.toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAccessibleName('Listening: 2/4 bài')
    expect(screen.getAllByText('Chưa có nội dung')).toHaveLength(3)
  })

  it('orders measurements chronologically and preserves regrading provenance', () => {
    const point: BandPoint = { attemptId: 'latest', submittedAt: '2026-11-05T12:00:00Z', band: 6.5, resultVersion: 2, pendingRegrade: true, gradingSource: 'TEACHER', scoringVersion: '2', measurementQuality: 'MEASURED' }
    const { container } = render(<BandHistoryChart points={[point, { ...point, attemptId: 'first', submittedAt: '2026-11-02T12:00:00Z', band: 5.5, resultVersion: 1, pendingRegrade: false }]} />)
    const titles = [...container.querySelectorAll('circle title')].map((element) => element.textContent)
    expect(titles).toEqual(['2026-11-02: band 5.5', '2026-11-05: band 6.5, đang chấm lại'])
    expect(screen.getByText('2 · đang chấm lại')).toBeInTheDocument()
  })
})
