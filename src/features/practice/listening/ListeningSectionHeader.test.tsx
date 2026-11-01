import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListeningSectionHeader } from './ListeningSectionHeader'

function renderHeader(props: Partial<Parameters<typeof ListeningSectionHeader>[0]> = {}) {
  render(
    <ListeningSectionHeader
      sectionLabel="Section 3"
      title="Section 3: Planning a river survey"
      instructions="You will hear a recording. Answer Questions 21-30 as you listen."
      numbers={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
      answeredNumbers={new Set([1, 2, 3])}
      {...props}
    />,
  )
}

describe('ListeningSectionHeader', () => {
  it('names the section once: the label is the chip, the title keeps only the topic', () => {
    renderHeader()

    expect(screen.getByRole('heading', { name: 'Planning a river survey' })).toBeInTheDocument()
    expect(screen.getByText('Section 3')).toBeInTheDocument()
  })

  it('numbers the questions as the screen does, not as the data of the whole test does', () => {
    renderHeader()

    expect(screen.getByText('You will hear a recording. Answer Questions 1–10 as you listen.')).toBeInTheDocument()
  })

  it('shows how many questions of the section are answered', () => {
    renderHeader()

    expect(screen.getByLabelText('Đã trả lời 3 trên 10 câu')).toBeInTheDocument()
  })

  it('has no instructions line when the data has none', () => {
    renderHeader({ instructions: null })

    expect(screen.queryByText(/You will hear/)).not.toBeInTheDocument()
  })
})
