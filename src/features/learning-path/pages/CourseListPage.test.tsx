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
  return document.querySelector('.lp-tiles progress.lp-progress') as HTMLProgressElement
}

describe('CourseListPage lesson progress', () => {
  beforeEach(() => {
    listCourses.mockReset()
    getSuggestions.mockReset()
    getSuggestions.mockResolvedValue([])
  })

  it('shows the fixed four skills and the lessons they add up to instead of a topic count', async () => {
    await renderCourse(course())
    expect(document.querySelector('.lp-tile__facts')).toHaveTextContent('4 kỹ năng · 15 bài học')
    expect(document.querySelector('.lp-tiles')).not.toHaveTextContent('chặng')
  })

  it('fills the bar by the share of lessons completed', async () => {
    const bar = await renderCourse(course())
    expect(document.querySelector('.lp-tile__count')).toHaveTextContent('3/15 bài')
    expect(bar).toHaveAttribute('value', '20')
  })

  it('leaves the bar empty when nothing was studied', async () => {
    const bar = await renderCourse(course({ completedLessons: 0, lastStudiedAt: null }))
    await screen.findByText('Chưa bắt đầu')
    expect(bar).toHaveAttribute('value', '0')
  })

  it('keeps counting lessons when every topic has passed', async () => {
    const bar = await renderCourse(course({ passedTopicCount: 7, completedLessons: 15 }))
    expect(document.querySelector('.lp-tile__count')).toHaveTextContent('15/15 bài')
    expect(bar).toHaveAttribute('value', '100')
  })

  it('falls back to the topic share while a course has no lessons counted yet', async () => {
    const bar = await renderCourse(course({ totalLessons: 0, completedLessons: 0, passedTopicCount: 2, lastStudiedAt: null }))
    expect(document.querySelector('.lp-tile__facts')).toHaveTextContent(/^4 kỹ năng$/)
    expect(bar).toHaveAttribute('value', '29')
  })
})
