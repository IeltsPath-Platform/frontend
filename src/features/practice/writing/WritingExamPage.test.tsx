import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WritingExamPage } from './WritingExamPage'
import type { WritingTask } from './writingApi'

const start = vi.hoisted(() => vi.fn())
vi.mock('./useGradeFlow', () => ({
  useGradeFlow: () => ({ start, checking: false, dialogs: null, pendingNotice: null }),
}))

const task: WritingTask = {
  packageId: 'p', packageVersionId: 'pv', sectionId: 'section-exam', questionVersionId: 'qv', packageTitle: 'Package',
  title: 'Task 2: Working from home', partNo: 2, task: 'TASK_2', minWords: 250, timeLimitSeconds: 60, instructions: null,
  prompt: 'Some people work from home. Discuss both views.', guide: '# Guide\nDo not show this.', images: [],
}

function renderExam() {
  return render(<MemoryRouter><WritingExamPage task={task} /></MemoryRouter>)
}

describe('WritingExamPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.clear()
    start.mockClear()
  })
  afterEach(() => vi.useRealTimers())

  it('counts down from the time limit and shows no guide', () => {
    renderExam()

    expect(screen.getByRole('timer')).toHaveTextContent('Còn 01:00')
    expect(screen.queryByText('HƯỚNG DẪN VIẾT BÀI')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Tra từ vựng')).not.toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(10_000) })
    expect(screen.getByRole('timer')).toHaveTextContent('Còn 00:50')
  })

  it('names the part and says how long to spend and how much to write, as the real test does', () => {
    renderExam()

    expect(screen.getAllByText('Part 2')).toHaveLength(2)
    expect(screen.getByText('You should spend about 1 minutes on this task. Write at least 250 words.')).toBeInTheDocument()
  })

  it('counts the words of the single essay box', () => {
    renderExam()

    fireEvent.change(screen.getByLabelText('Bài viết của bạn', { selector: 'textarea' }), { target: { value: 'One two three' } })

    expect(screen.getByText('Words: 3')).toBeInTheDocument()
  })

  it('finishes from the tick at the end of the footer', () => {
    renderExam()
    expect(screen.getByRole('button', { name: 'Hoàn thành bài làm' })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Bài viết của bạn', { selector: 'textarea' }), { target: { value: 'Some essay' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn thành bài làm' }))

    expect(start).toHaveBeenCalledTimes(1)
  })

  it('locks the essay and sends it to grading when the time is up', () => {
    renderExam()
    const box = screen.getByLabelText('Bài viết của bạn', { selector: 'textarea' })
    fireEvent.change(box, { target: { value: 'Some essay text' } })

    act(() => { vi.advanceTimersByTime(60_000) })

    expect(screen.getByRole('timer')).toHaveTextContent('Còn 00:00')
    expect(box).toHaveAttribute('readonly')
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('does not grade an empty essay when the time is up', () => {
    renderExam()

    act(() => { vi.advanceTimersByTime(60_000) })

    expect(start).not.toHaveBeenCalled()
  })
})
