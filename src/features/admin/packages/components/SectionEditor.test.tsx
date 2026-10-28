import { fireEvent, render, screen } from '@/test/render'
import { describe, expect, it, vi } from 'vitest'
import { section, sectionRequest } from '../testFixtures'
import { SectionEditor } from './SectionEditor'

describe('SectionEditor', () => {
  it.each(['', '   ', 'x'.repeat(256)])('rejects invalid titles before saving', (title) => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<SectionEditor sortOrder={1} busy={false} onSave={save} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Tiêu đề phần'), { target: { value: title } })
    fireEvent.submit(screen.getByRole('form'))
    expect(screen.getByRole('alert')).toHaveTextContent('Nhập tiêu đề phần, tối đa 255 ký tự.')
    expect(save).not.toHaveBeenCalled()
  })
  it.each(['0', '-1', '0.001', '40000000'])('rejects an invalid minute duration %s', (minutes) => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<SectionEditor section={section} sortOrder={section.sortOrder} busy={false} onSave={save} onCancel={vi.fn()} />)
    fireEvent.change(screen.getByLabelText('Thời gian (phút)'), { target: { value: minutes } })
    fireEvent.submit(screen.getByRole('form'))
    expect(screen.getByRole('alert')).toHaveTextContent('Thời gian phải lớn hơn 0')
    expect(save).not.toHaveBeenCalled()
  })
  it('allows clearing optional fields while retaining the existing cover and sort order', () => {
    const save = vi.fn().mockResolvedValue(undefined)
    render(<SectionEditor section={section} sortOrder={section.sortOrder} busy={false} onSave={save} onCancel={vi.fn()} />)
    for (const label of ['Kỹ năng', 'Phần thi', 'Thời gian (phút)', 'Hướng dẫn']) {
      fireEvent.change(screen.getByLabelText(label), { target: { value: '' } })
    }
    fireEvent.submit(screen.getByRole('form'))
    expect(save).toHaveBeenCalledExactlyOnceWith({ ...sectionRequest, skill: null, partNo: null, timeLimitSeconds: null, instructions: null })
  })
})
