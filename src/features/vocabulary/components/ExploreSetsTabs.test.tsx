import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { notebookApi, type VocabularySetSummary } from '../api/notebookApi'
import { ExploreSetsTabs } from './ExploreSetsTabs'

vi.mock('../api/notebookApi', () => ({ notebookApi: { getSets: vi.fn(), getTopics: vi.fn() } }))

const base = { description: null, kind: 'BAND', coverKey: null, coverUrl: null, sortOrder: 1, status: 'ACTIVE' } as const
const sets = [
  { ...base, id: 'a1', title: 'A1 Foundation', cefrLevel: 'A1', bandRange: { min: 1, max: 2.5 }, wordCount: 1 },
  { ...base, id: 'b1', title: 'B1 Intermediate', cefrLevel: 'B1', bandRange: { min: 4, max: 5 }, wordCount: 20 },
  { ...base, id: 'x', title: 'Legacy', cefrLevel: 'B2', bandRange: '5.5–6.5', wordCount: 3 },
  { ...base, id: 'n', title: 'No range', cefrLevel: 'C1', bandRange: null, wordCount: 2 },
] as VocabularySetSummary[]

beforeEach(() => {
  vi.mocked(notebookApi.getSets).mockResolvedValue({ items: sets } as never)
  vi.mocked(notebookApi.getTopics).mockResolvedValue([])
})

describe('ExploreSetsTabs band badges', () => {
  it('prints the band range instead of [object Object]', async () => {
    const { container } = render(<MemoryRouter><ExploreSetsTabs /></MemoryRouter>)
    expect(await screen.findByText('Band 1.0–2.5')).toBeInTheDocument()
    expect(screen.getByText('Band 4.0–5.0')).toBeInTheDocument()
    expect(screen.getByText('Band 5.5–6.5')).toBeInTheDocument()
    expect(screen.getByText('CEFR C1')).toBeInTheDocument()
    expect(container.textContent).not.toContain('[object Object]')
  })
})
