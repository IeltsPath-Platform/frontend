import { fireEvent, render, screen } from '@testing-library/react'
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

  const sample = (attemptId: string, submittedAt: string, band: number): BandPoint => ({ attemptId, submittedAt, band, resultVersion: 1, pendingRegrade: false, gradingSource: 'AI', scoringVersion: '1', measurementQuality: 'MEASURED' })
  it('shows all values by default and the attempt tooltip only while hovering', () => {
    const { container } = render(<BandHistoryChart points={[sample('a', '2026-10-01T12:00:00Z', 5), sample('b', '2026-10-15T12:00:00Z', 5.5), sample('c', '2026-11-01T12:00:00Z', 6.5)]} />)
    expect(container.querySelectorAll('.band-axis-label').length).toBeGreaterThanOrEqual(7)
    expect([...container.querySelectorAll('.band-point-label')].map((e) => e.textContent)).toEqual(['5.0', '5.5', '6.5'])
    expect(container.querySelector('.band-tip')).not.toBeInTheDocument()
    expect(container.querySelector('.band-active-guide')).not.toBeInTheDocument()
    fireEvent.pointerEnter(container.querySelectorAll('.band-hit')[2])
    expect([...container.querySelectorAll('.band-point-label')].map((e) => e.textContent)).toEqual(['5.0', '5.5'])
    expect(container.querySelector('.band-tip-band')?.textContent).toBe('Band 6.5')
    expect(container.querySelector('.band-tip-change')?.textContent).toBe('+1.0 so với lần trước')
    expect(screen.getByText('Lần thi 3/3 · 01/11/2026')).toBeInTheDocument()
    expect(screen.getByText('Tăng 1.0 so với lần trước')).toBeInTheDocument()
    expect(screen.getByText('AI chấm')).toBeInTheDocument()
    fireEvent.pointerLeave(container.querySelector('svg')!)
    expect(container.querySelector('.band-tip')).not.toBeInTheDocument()
    expect(container.querySelector('.band-active-guide')).not.toBeInTheDocument()
    expect(container.querySelector('.statistics-actual.is-active')).not.toBeInTheDocument()
    expect(container.querySelectorAll('.band-point-label')).toHaveLength(3)
    fireEvent.pointerEnter(container.querySelectorAll('circle')[0])
    expect(container.querySelector('.band-tip-band')?.textContent).toBe('Band 5.0')
  })
  it('draws the first-attempt and target reference lines with a legend', () => {
    const { container } = render(<BandHistoryChart points={[sample('a', '2026-10-01T12:00:00Z', 5), sample('b', '2026-11-01T12:00:00Z', 6)]} targetBand={7} />)
    expect(container.querySelector('.band-ref-line.is-start')).toBeInTheDocument()
    expect(container.querySelector('.band-ref-line.is-target')).toBeInTheDocument()
    expect(screen.getByText('Mục tiêu 7.0', { selector: 'li' })).toBeInTheDocument()
    expect(screen.getByText('Lần đầu 5.0')).toBeInTheDocument()
  })
  it('selects an attempt from the keyboard and describes its change', async () => {
    const { container } = render(<BandHistoryChart points={[sample('a', '2026-10-01T12:00:00Z', 6), sample('b', '2026-11-01T12:00:00Z', 5.5)]} />)
    const circles = container.querySelectorAll<SVGCircleElement>('circle')
    circles[1].focus()
    expect(await screen.findByText('Giảm 0.5 so với lần trước')).toBeInTheDocument()
    circles[0].focus()
    expect(await screen.findByText('Lần thi đầu tiên trong khoảng này')).toBeInTheDocument()
    expect(container.querySelector('.band-tip-band')?.textContent).toBe('Band 6.0')
    fireEvent.pointerEnter(container.querySelectorAll('.band-hit')[1])
    expect(container.querySelector('.band-tip-band')?.textContent).toBe('Band 5.5')
    fireEvent.pointerLeave(container.querySelector('svg')!)
    expect(container.querySelector('.band-tip-band')?.textContent).toBe('Band 6.0')
    fireEvent.blur(circles[0])
    expect(container.querySelector('.band-tip')).not.toBeInTheDocument()
  })
  it('labels no reference line for a single measurement', () => {
    const { container } = render(<BandHistoryChart points={[sample('a', '2026-10-01T12:00:00Z', 5)]} />)
    expect(container.querySelector('.band-ref-line.is-start')).not.toBeInTheDocument()
    expect(container.querySelectorAll('circle')).toHaveLength(1)
  })
  it('draws the placement band as a reference line and drops the overlapping first-attempt line', () => {
    const points = [sample('a', '2026-10-01T12:00:00Z', 5), sample('b', '2026-11-01T12:00:00Z', 6)]
    const { container, rerender } = render(<BandHistoryChart points={points} placementBand={4} />)
    expect(container.querySelector('.band-ref-line.is-placement')).toBeInTheDocument()
    expect(screen.getByText('Đầu vào 4.0')).toBeInTheDocument()
    expect(container.querySelector('.band-ref-line.is-start')).toBeInTheDocument()
    rerender(<BandHistoryChart points={points} placementBand={5} />)
    expect(container.querySelector('.band-ref-line.is-start')).not.toBeInTheDocument()
    expect(container.querySelector('.band-ref-line.is-placement')).toBeInTheDocument()
  })
})
