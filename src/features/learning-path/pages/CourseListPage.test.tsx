import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import type { CourseSummary } from '~types/learningPath'
import { CourseListPage } from './CourseListPage'

const { listCourses, getSuggestions } = vi.hoisted(() => ({
  listCourses: vi.fn(),
  getSuggestions: vi.fn(),
}))

vi.mock('../api', () => ({ learningApi: { listCourses, getSuggestions } }))

function course(overrides: Partial<CourseSummary> = {}): CourseSummary {
  return {
    id: 'course-1',
    code: 'B1',
    title: 'Starter course',
    bandLevel: 4,
    topicCount: 7,
    passedTopicCount: 0,
    completedLessons: 3,
    totalLessons: 15,
    lastStudiedAt: '2026-10-20T09:00:00Z',
    recommended: false,
    testStatus: 'LOCKED',
    ...overrides,
  }
}

async function renderCourse(row: CourseSummary) {
  listCourses.mockResolvedValue([row])
  render(<MemoryRouter><ToastProvider><CourseListPage /></ToastProvider></MemoryRouter>)
  await screen.findByRole('list', { name: 'Danh sách khóa học theo band' })
  return document.querySelector('.lp-tiles .lp-segs') as HTMLElement
}

describe('CourseListPage topic progress', () => {
  beforeEach(() => {
    listCourses.mockReset()
    getSuggestions.mockReset()
    getSuggestions.mockResolvedValue([])
  })

  it('shows lesson progress as a full and partial topic segment', async () => {
    const meter = await renderCourse(course())
    expect(document.querySelector('.lp-tile__count')).toHaveTextContent('3/15 bài · 0/7 chặng')
    expect(meter.querySelectorAll('i.is-done')).toHaveLength(1)
    expect(meter.querySelector('i.is-partial')).toHaveStyle({ '--fill': '40%' })
    expect(meter).toHaveAttribute('aria-valuenow', '1.4')
    expect(meter).toHaveAttribute('aria-label', expect.stringContaining('40%'))
  })

  it('leaves every segment empty when no lesson or topic is complete', async () => {
    const meter = await renderCourse(course({ completedLessons: 0, lastStudiedAt: null }))
    await screen.findByText('Chưa bắt đầu')
    expect(meter.querySelectorAll('i.is-done, i.is-partial')).toHaveLength(0)
  })

  it('fills every topic when all topics have passed', async () => {
    const meter = await renderCourse(course({ passedTopicCount: 7 }))
    expect(document.querySelector('.lp-tile__count')).toHaveTextContent('3/15 bài · 7/7 chặng')
    expect(meter.querySelectorAll('i.is-done')).toHaveLength(7)
    expect(meter.querySelector('i.is-partial')).not.toBeInTheDocument()
  })

  it('keeps passed topics full when passed topics exceed the lesson ratio', async () => {
    const meter = await renderCourse(course({ passedTopicCount: 2, completedLessons: 1 }))
    expect(document.querySelector('.lp-tile__count')).toHaveTextContent('1/15 bài · 2/7 chặng')
    expect(meter.querySelectorAll('i.is-done')).toHaveLength(2)
    expect(meter.querySelector('i.is-partial')).not.toBeInTheDocument()
  })
})
