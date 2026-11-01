import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { PracticeBreadcrumb } from './PracticeBreadcrumb'

describe('PracticeBreadcrumb', () => {
  it('shows the path the learner came by, with every step but the last a link', () => {
    render(
      <MemoryRouter>
        <PracticeBreadcrumb items={[
          { label: 'Luyện tập', to: '/practice-tests' },
          { label: 'Reading', to: '/practice-tests?skill=reading' },
          { label: 'Passage 2', to: '/practice-tests?skill=reading&part=2' },
          { label: 'Kết quả' },
        ]} />
      </MemoryRouter>,
    )

    const path = screen.getByRole('navigation', { name: 'Đường dẫn' })
    expect(within(path).getAllByRole('listitem').filter((item) => item.textContent)).toHaveLength(4)
    expect(within(path).getByRole('link', { name: 'Luyện tập' })).toHaveAttribute('href', '/practice-tests')
    expect(within(path).getByRole('link', { name: 'Passage 2' })).toHaveAttribute('href', '/practice-tests?skill=reading&part=2')
    expect(within(path).queryByRole('link', { name: 'Kết quả' })).not.toBeInTheDocument()
    expect(within(path).getByText('Kết quả')).toHaveAttribute('aria-current', 'page')
  })

  it('does not call the word "Danh mục" a step of the path', () => {
    render(<MemoryRouter><PracticeBreadcrumb items={[{ label: 'Writing', to: '/practice-tests?skill=writing' }, { label: 'Kết quả' }]} /></MemoryRouter>)

    expect(screen.queryByText('Danh mục')).not.toBeInTheDocument()
  })
})
