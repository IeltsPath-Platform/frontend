import { useState } from 'react'
import { fireEvent, render, screen } from '@/test/render'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { bandText, optionalText, requiredText } from '@/lib/validation/fields'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { AdminField } from './AdminField'

const schema = z.object({ name: requiredText('Tên khóa học', 10), band: bandText('Band khóa học'), note: optionalText('Ghi chú', 20) })

function Form({ onValid }: { onValid: () => void }) {
  const [name, setName] = useState('')
  const [band, setBand] = useState('')
  const [note, setNote] = useState('')
  const form = useFormErrors(schema, { name, band, note })
  return <form aria-label="Thử" noValidate onSubmit={(event) => { event.preventDefault(); if (form.validate()) onValid() }}>
    <AdminField label="Tên khóa học" {...form.field('name')}><input value={name} onChange={(event) => setName(event.target.value)} /></AdminField>
    <AdminField label="Band khóa học" {...form.field('band')}><input value={band} onChange={(event) => setBand(event.target.value)} /></AdminField>
    <AdminField label="Ghi chú" {...form.field('note')}><textarea value={note} onChange={(event) => setNote(event.target.value)} /></AdminField>
    <button type="submit">Lưu</button>
  </form>
}

describe('AdminField with useFormErrors', () => {
  it('marks a required field with a red star that is not part of its name, and an optional one without', () => {
    const { container } = render(<Form onValid={() => {}} />)
    expect(screen.getByLabelText('Tên khóa học')).toHaveAttribute('aria-required', 'true')
    expect(screen.getByLabelText('Ghi chú')).not.toHaveAttribute('aria-required')
    expect(container.querySelectorAll('.adm-required')).toHaveLength(2)
    expect(container.querySelector('label[for] .adm-required')).toHaveAttribute('aria-hidden', 'true')
  })

  it('shows no error before the form is sent or a field is left', () => {
    render(<Form onValid={() => {}} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Tên khóa học')).not.toHaveAttribute('aria-invalid')
  })

  it('on send shows every error under its own field, one message each, and focuses the first', () => {
    let sent = 0
    render(<Form onValid={() => { sent += 1 }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    const alerts = screen.getAllByRole('alert')
    expect(alerts.map((alert) => alert.textContent)).toEqual(['Tên khóa học không được để trống.', 'Band khóa học không được để trống.'])
    const name = screen.getByLabelText('Tên khóa học')
    expect(name).toHaveAttribute('aria-invalid', 'true')
    expect(name).toHaveAttribute('aria-describedby', alerts[0]!.id)
    expect(name.closest('.adm-field')).toHaveClass('is-invalid')
    expect(name).toHaveFocus()
    expect(sent).toBe(0)
  })

  it('clears an error as the value is fixed and sends once everything is valid', () => {
    let sent = 0
    render(<Form onValid={() => { sent += 1 }} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    fireEvent.change(screen.getByLabelText('Tên khóa học'), { target: { value: 'Nền tảng' } })
    expect(screen.getAllByRole('alert')).toHaveLength(1)
    fireEvent.change(screen.getByLabelText('Band khóa học'), { target: { value: '5.3' } })
    expect(screen.getByRole('alert')).toHaveTextContent('Band khóa học phải từ 0 đến 9, bước 0,5.')
    fireEvent.change(screen.getByLabelText('Band khóa học'), { target: { value: '5.5' } })
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(sent).toBe(1)
  })

  it('shows the error of a field the author left, before the form is sent', () => {
    render(<Form onValid={() => {}} />)
    fireEvent.blur(screen.getByLabelText('Band khóa học'))
    expect(screen.getByRole('alert')).toHaveTextContent('Band khóa học không được để trống.')
    expect(screen.getByLabelText('Tên khóa học')).not.toHaveAttribute('aria-invalid')
  })

  it('keeps the label separate from the message, so the field is still found by its label', () => {
    render(<Form onValid={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(screen.getByLabelText('Band khóa học')).toBeInTheDocument()
    expect(screen.getByLabelText('Ghi chú')).toBeInTheDocument()
  })
})
