import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ConsultationSection } from './ConsultationSection'

function fillAndSubmit(name: string, phone: string) {
  fireEvent.change(screen.getByLabelText('Họ và tên'), { target: { value: name } })
  fireEvent.change(screen.getByLabelText('Số điện thoại'), { target: { value: phone } })
  fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))
}

describe('ConsultationSection', () => {
  it('asks for a name when the form is submitted empty and opens no success dialog', () => {
    render(<ConsultationSection />)
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }))

    expect(screen.getByRole('status')).toHaveTextContent('Vui lòng nhập họ và tên.')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('rejects a phone number that is not a Vietnamese phone format', () => {
    render(<ConsultationSection />)
    fillAndSubmit('Nguyễn Văn A', '12345')

    expect(screen.getByRole('status')).toHaveTextContent('Số điện thoại không hợp lệ')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('accepts a phone number with spaces, shows the success dialog and clears the form', () => {
    render(<ConsultationSection />)
    fillAndSubmit('Nguyễn Văn A', '0912 345 678')

    expect(screen.getByRole('dialog')).toHaveTextContent('Đã gửi yêu cầu tư vấn!')
    expect(screen.getByLabelText('Họ và tên')).toHaveValue('')
    expect(screen.getByLabelText('Số điện thoại')).toHaveValue('')
  })

  it('closes the success dialog from the continue button', () => {
    render(<ConsultationSection />)
    fillAndSubmit('Nguyễn Văn A', '+84912345678')
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục khám phá/ }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
