import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { packageId } from '../testFixtures'
import { PackagesPage } from './PackagesPage'

const { getPackage } = vi.hoisted(() => ({ getPackage: vi.fn() }))
vi.mock('../api/packageApi', () => ({ getPackage }))
function Location() { return <output data-testid="location">{useLocation().pathname}</output> }
describe('PackagesPage', () => {
  it('requires a UUID and opens an existing package without fetching a catalog', () => {
    render(<MemoryRouter initialEntries={['/content-author/packages']}><PackagesPage /><Location /></MemoryRouter>)
    expect(screen.getByRole('button', { name: 'Danh sách gói · Chờ backend' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Tạo gói mới · Chờ backend' })).toBeDisabled()
    const input = screen.getByLabelText('ID gói (UUID)')
    fireEvent.change(input, { target: { value: 'not-a-uuid' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Mở gói có sẵn' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Nhập ID gói hợp lệ')
    expect(screen.getByTestId('location')).toHaveTextContent('/content-author/packages')
    fireEvent.change(input, { target: { value: ` ${packageId} ` } })
    fireEvent.submit(screen.getByRole('form', { name: 'Mở gói có sẵn' }))
    expect(screen.getByTestId('location')).toHaveTextContent(`/content-author/packages/${packageId}`)
    expect(getPackage).not.toHaveBeenCalled()
  })
})
