import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { SkillType } from '@/types/practice'
import type { PracticePart } from '../lib/practiceSkillConfig'
import { PracticeSidebar } from './PracticeSidebar'

function show(currentSkill: SkillType = 'listening', selectedPart: PracticePart = 1, onSelectPart = vi.fn()) {
  render(
    <MemoryRouter>
      <PracticeSidebar
        currentSkill={currentSkill}
        selectedPart={selectedPart}
        onSelectPart={onSelectPart}
        formats={[{ code: 'GAP_FILL', sectionCount: 3 }]}
        selectedFormats={[]}
        onToggleFormat={vi.fn()}
      />
    </MemoryRouter>,
  )
  return { onSelectPart }
}

describe('the filter column of the practice catalogue', () => {
  it('carries no logo, and its skills drop down their parts: the open one shows its parts with the chosen one checked', () => {
    show('listening', 2)

    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    const open = screen.getByRole('button', { name: 'Listening' })
    expect(open).toHaveAttribute('aria-expanded', 'true')
    const parts = within(screen.getByRole('group', { name: 'Bài luyện Listening' }))
    expect(parts.getAllByRole('radio').map((radio) => radio.parentElement?.textContent)).toEqual([
      'Section 1', 'Section 2', 'Section 3', 'Section 4', 'Full đề',
    ])
    expect(parts.getByRole('radio', { name: 'Section 2' })).toBeChecked()
    expect(parts.getByRole('radio', { name: 'Section 1' })).not.toBeChecked()
  })

  it('folds and unfolds the parts of the open skill when it is pressed, and drops the chevron class with it', () => {
    show('writing', 1)
    const header = screen.getByRole('button', { name: 'Writing' })
    const item = header.closest('li')

    expect(item).toHaveClass('is-open')
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'false')
    expect(item).not.toHaveClass('is-open')
    fireEvent.click(header)
    expect(header).toHaveAttribute('aria-expanded', 'true')
    expect(item).toHaveClass('is-open')
  })

  it('keeps the other skills folded and leads to them with a link; only the open skill has parts to pick', () => {
    show('reading', 1)

    expect(screen.getByRole('link', { name: 'Listening' })).toHaveAttribute('href', '/practice-tests?skill=listening')
    expect(screen.getByRole('link', { name: 'Speaking' })).toHaveAttribute('href', '/practice-tests?skill=speaking')
    const other = screen.getByRole('link', { name: 'Listening' }).closest('li')
    expect(other).not.toHaveClass('is-open')
    const folded = within(other as HTMLElement).getAllByRole('radio', { hidden: true })
    expect(folded.every((radio) => (radio as HTMLInputElement).disabled && !(radio as HTMLInputElement).checked)).toBe(true)
  })

  it('tells which part the learner picked', () => {
    const { onSelectPart } = show('speaking', 1)

    fireEvent.click(within(screen.getByRole('group', { name: 'Bài luyện Speaking' })).getByRole('radio', { name: 'Part 3' }))

    expect(onSelectPart).toHaveBeenCalledWith(3)
  })
})
