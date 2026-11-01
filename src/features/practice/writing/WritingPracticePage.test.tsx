import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { WritingPracticePage } from './WritingPracticePage'
import type { WritingTask } from './writingApi'

const start = vi.hoisted(() => vi.fn())
vi.mock('./useGradeFlow', () => ({
  useGradeFlow: () => ({ start, checking: false, dialogs: null, pendingNotice: null }),
}))

const task: WritingTask = {
  packageId: 'p', packageVersionId: 'pv', sectionId: 'section-practice', questionVersionId: 'qv', packageTitle: 'Package',
  title: 'Task 1: Library visits', partNo: 1, task: 'TASK_1', minWords: 150, timeLimitSeconds: 1200, instructions: null,
  prompt: 'The table shows library visits.', guide: '## 1. Giải thích đề\nĐề bài thuộc dạng Table.', images: [],
}

function renderPractice() {
  return render(<MemoryRouter><WritingPracticePage task={task} /></MemoryRouter>)
}

describe('WritingPracticePage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    start.mockClear()
  })

  it('has the task with its guide, one answer box and the dictionary', () => {
    renderPractice()

    expect(screen.getByRole('region', { name: 'Đề bài' })).toHaveTextContent('The table shows library visits.')
    expect(screen.getByText('HƯỚNG DẪN VIẾT BÀI')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox', { name: 'Bài làm của bạn' })).toHaveLength(1)
    expect(screen.getByRole('complementary', { name: 'Tra từ vựng' })).toBeInTheDocument()
    expect(screen.queryByText(/Tra Việt-Anh|Tra Anh-Việt/)).not.toBeInTheDocument()
  })

  it('shows the clock at the top', () => {
    renderPractice()

    expect(screen.getByRole('timer')).toHaveTextContent('00:00 / 20:00')
  })

  it('has a bar to drag between the task and the answer and another between the answer and the dictionary', () => {
    renderPractice()

    expect(screen.getAllByRole('separator')).toHaveLength(2)
  })

  it('counts the words and finishes only when something is written', () => {
    renderPractice()
    const finish = screen.getByRole('button', { name: 'Hoàn thành' })
    expect(finish).toBeDisabled()

    fireEvent.change(screen.getByRole('textbox', { name: 'Bài làm của bạn' }), { target: { value: 'One two three' } })

    expect(screen.getByText('Word count: 3')).toBeInTheDocument()
    fireEvent.click(finish)
    expect(start).toHaveBeenCalledTimes(1)
  })
})
