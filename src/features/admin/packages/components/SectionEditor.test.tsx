import { fireEvent, render, screen } from '@/test/render'
import { describe, expect, it, vi } from 'vitest'
import { section, sectionRequest } from '../testFixtures'
import { SectionEditor } from './SectionEditor'

describe('SectionEditor', () => {
  it.each([['', 'Tiêu đề phần không được để trống.'], ['   ', 'Tiêu đề phần không được để trống.'], ['x'.repeat(256), 'Tiêu đề phần tối đa 255 ký tự.']])('rejects invalid titles before saving', (title, message) => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<SectionEditor sortOrder={1} siblings={[]} busy={false} onSave={save} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Tiêu đề phần'), { target: { value: title } })
    fireEvent.submit(screen.getByRole('form'))
    expect(screen.getByLabelText('Tiêu đề phần')).toHaveAccessibleDescription(message)
    expect(save).not.toHaveBeenCalled()
  })
  it.each(['0', '-1', '0.001', '40000000'])('rejects an invalid minute duration %s', (minutes) => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<SectionEditor section={section} sortOrder={section.sortOrder} siblings={[]} busy={false} onSave={save} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Thời gian (phút)'), { target: { value: minutes } })
    fireEvent.submit(screen.getByRole('form'))
    expect(screen.getByRole('alert')).toHaveTextContent('Thời gian phải lớn hơn 0')
    expect(save).not.toHaveBeenCalled()
  })
  it('does not offer a part number another section of the same skill already holds', () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<SectionEditor sortOrder={1} siblings={[{ skill: 'READING', partNo: 1 }, { skill: 'LISTENING', partNo: 3 }, { skill: 'LISTENING', partNo: 4 }]} busy={false} onSave={save} onCancel={vi.fn()} />)
    const parts = () => screen.getAllByRole('option').filter((option) => /^(Phần|Task) /.test(option.textContent ?? '')).map((option) => [option.textContent, (option as HTMLOptionElement).disabled])
    fireEvent.change(screen.getByLabelText('Kỹ năng'), { target: { value: 'READING' } })
    expect(parts()).toEqual([['Phần 1 (đã dùng)', true], ['Phần 2', false], ['Phần 3', false]])
    fireEvent.change(screen.getByLabelText('Kỹ năng'), { target: { value: 'WRITING' } })
    expect(parts()).toEqual([['Task 1', false], ['Task 2', false]])
    fireEvent.change(screen.getByLabelText('Kỹ năng'), { target: { value: 'LISTENING' } })
    expect(parts()).toEqual([['Phần 1', false], ['Phần 2', false], ['Phần 3 (đã dùng)', true], ['Phần 4 (đã dùng)', true]])
  })
  it('allows clearing optional fields while retaining the existing cover and sort order', () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<SectionEditor section={section} sortOrder={section.sortOrder} siblings={[]} busy={false} onSave={save} onCancel={vi.fn()} />)
    for (const label of ['Kỹ năng', 'Phần thi', 'Thời gian (phút)', 'Hướng dẫn']) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: '' } })
    }
    fireEvent.submit(screen.getByRole('form'))
    expect(save).toHaveBeenCalledExactlyOnceWith({ ...sectionRequest, skill: null, partNo: null, timeLimitSeconds: null, instructions: null })
  })
})


