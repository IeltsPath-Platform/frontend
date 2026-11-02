import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('has the task with its guide, the answer in its parts and the dictionary', () => {
    renderPractice()

    expect(screen.getByRole('region', { name: 'Đề bài' })).toHaveTextContent('The table shows library visits.')
    expect(screen.getByText('HƯỚNG DẪN VIẾT BÀI')).toBeInTheDocument()
    expect(within(screen.getByRole('group', { name: 'Bài làm của bạn' })).getAllByRole('textbox').map((box) => box.id)).toEqual(['ww-part-0', 'ww-part-1', 'ww-part-2', 'ww-part-3'])
    for (const label of ['Introduction', 'Overview', 'Body 1', 'Body 2']) expect(screen.getByRole('textbox', { name: label })).toBeInTheDocument()
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

    fireEvent.change(screen.getByRole('textbox', { name: 'Introduction' }), { target: { value: 'One two three' } })
    fireEvent.change(screen.getByRole('textbox', { name: 'Overview' }), { target: { value: 'four five' } })

    expect(screen.getByText('Word count: 5')).toBeInTheDocument()
    fireEvent.click(finish)
    expect(start).toHaveBeenCalledTimes(1)
  })

  it('has introduction, two bodies and a conclusion for Task 2', () => {
    render(<MemoryRouter><WritingPracticePage task={{ ...task, task: 'TASK_2', title: 'Task 2: Libraries' }} /></MemoryRouter>)

    expect(within(screen.getByRole('group', { name: 'Bài làm của bạn' })).getAllByRole('textbox').map((box) => box.getAttribute('placeholder'))).toEqual([
      'Viết phần Introduction của bạn ở đây…', 'Viết phần Body 1 của bạn ở đây…', 'Viết phần Body 2 của bạn ở đây…', 'Viết phần Conclusion của bạn ở đây…',
    ])
  })

  it('offers no model answer switch when the prompt has none', () => {
    renderPractice()

    expect(screen.queryByRole('switch', { name: 'Bài mẫu' })).not.toBeInTheDocument()
  })

  it('shows the model answer in the parts, read only, and brings back what was written', () => {
    const sample = ['Intro **phrase**.', 'Overview text.', 'Body one.', 'Body two.'].join('\n\n')
    render(<MemoryRouter><WritingPracticePage task={{ ...task, sampleAnswer: sample }} /></MemoryRouter>)
    fireEvent.change(screen.getByRole('textbox', { name: 'Introduction' }), { target: { value: 'My own intro' } })

    fireEvent.click(screen.getByRole('switch', { name: 'Bài mẫu' }))

    expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveValue('Intro phrase.')
    expect(screen.getByRole('textbox', { name: 'Body 2' })).toHaveValue('Body two.')
    expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveAttribute('readonly')
    expect(screen.getByRole('button', { name: 'Hoàn thành' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Lưu nháp' })).toBeDisabled()

    // Even a change that gets past read only (a paste, a script) leaves the sample and the essay alone.
    fireEvent.change(screen.getByRole('textbox', { name: 'Introduction' }), { target: { value: 'Typed over the sample' } })
    expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveValue('Intro phrase.')
    expect(window.localStorage.getItem('writing-draft:section-practice:practice')).toBeNull()

    fireEvent.click(screen.getByRole('switch', { name: 'Bài mẫu' }))

    expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveValue('My own intro')
    expect(screen.getByRole('textbox', { name: 'Introduction' })).not.toHaveAttribute('readonly')
  })

  it('puts a draft written before the split into the first part', () => {
    window.localStorage.setItem('writing-draft:section-practice:practice', JSON.stringify({ texts: ['Old essay text'], seconds: 30 }))
    renderPractice()

    expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveValue('Old essay text')
    expect(screen.getByRole('textbox', { name: 'Overview' })).toHaveValue('')
  })
})
