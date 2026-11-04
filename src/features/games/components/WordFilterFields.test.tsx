import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { WordFilter, WordFilters } from '../types/game'
import { ANY_WORDS, type WordFiltersState } from '../lib/wordFilters'
import { WordFilterFields } from './WordFilterFields'

const filters: WordFilters = {
  topics: [
    { id: 't1', slug: 'environment', name: 'Environment', nameVi: 'Môi trường' },
    { id: 't2', slug: 'health', name: 'Health', nameVi: 'Sức khỏe' },
  ],
  availability: [
    { cefrLevel: null, topicId: null, words: 900 },
    { cefrLevel: 'B1', topicId: null, words: 150 },
    { cefrLevel: 'C2', topicId: null, words: 4 },
    { cefrLevel: null, topicId: 't1', words: 120 },
    { cefrLevel: null, topicId: 't2', words: 120 },
    { cefrLevel: 'B1', topicId: 't1', words: 22 },
    { cefrLevel: 'B1', topicId: 't2', words: 3 },
  ],
}
const state: WordFiltersState = { filters, loading: false, failed: false, retry: vi.fn() }

function Harness({ onChange }: { onChange?: (value: WordFilter) => void }) {
  const [value, setValue] = useState(ANY_WORDS)
  return (
    <WordFilterFields
      value={value}
      required={10}
      state={state}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
    />
  )
}

describe('WordFilterFields', () => {
  it('chooses a level and topic, and a second press clears the choice', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    const b1 = screen.getByRole('button', { name: 'B1 Trung cấp' })
    fireEvent.click(b1)
    expect(b1).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Môi trường' }))
    expect(onChange).toHaveBeenLastCalledWith({ cefrLevel: 'B1', topicId: 't1' })
    fireEvent.click(b1)
    expect(onChange).toHaveBeenLastCalledWith({ cefrLevel: null, topicId: 't1' })
  })

  it('disables choices with too few words, counted against the other choice, without showing counts', () => {
    render(<Harness />)
    expect(screen.getByRole('button', { name: 'C2 Thành thạo' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Sức khỏe' })).toBeEnabled()
    fireEvent.click(screen.getByRole('button', { name: 'B1 Trung cấp' }))
    expect(screen.getByRole('button', { name: 'Sức khỏe' })).toBeDisabled()
    expect(screen.queryByText(/\d+ từ/)).not.toBeInTheDocument()
  })
})
