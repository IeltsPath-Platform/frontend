import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ImportRowDrawer } from './ImportRowDrawer'

describe('ImportRowDrawer', () => {
  it('fills the fields from the cells and shows the reason under the field that failed', () => {
    render(
      <ImportRowDrawer
        cells={{ code: 'COURSE_X', name: 'Khóa thử', bandLevel: '4.5' }}
        errors={[{ sheet: 'Course', row: 3, column: 'code', code: 'CODE_CONFLICT', message: 'x' }, { sheet: 'Topics', row: 3, column: 'code', code: 'REQUIRED', message: 'y' }]}
        onClose={vi.fn()}
        row={3}
        sheet="Course"
        warnings={[]}
      />,
    )
    expect(screen.getByLabelText('Mã khóa học')).toHaveValue('COURSE_X')
    expect(screen.getByLabelText('Band')).toHaveValue('4.5')
    expect(screen.getByRole('alert')).toHaveTextContent('Mã, band hoặc thứ tự đã được sử dụng.')
    expect(screen.getByText('1 lỗi')).toBeInTheDocument()
  })
})
