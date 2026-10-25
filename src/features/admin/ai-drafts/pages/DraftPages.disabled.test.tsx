import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { QUESTION_DRAFTS_ENABLED } from '../draftFlags'
import { AiDraftDetailPage } from './AiDraftDetailPage'
import { AiDraftsPage } from './AiDraftsPage'

const api = vi.hoisted(() => ({ fetchAiDrafts: vi.fn(), fetchAiDraft: vi.fn(), approveQuestionDraft: vi.fn(), rejectAiDraft: vi.fn(), requestQuestionDraft: vi.fn() }))
const knowledge = vi.hoisted(() => ({ fetchKnowledgeTree: vi.fn() }))
vi.mock('../api/aiDraftApi', () => api)
vi.mock('../draftFlags', () => ({ QUESTION_DRAFTS_ENABLED: false }))
vi.mock('../../knowledge-graph/api/knowledgeGraphApi', () => knowledge)
describe('question drafts rollout', () => {
  it.each([AiDraftsPage, AiDraftDetailPage])('renders the deployment placeholder without any draft or knowledge calls', (Page) => {
    expect(QUESTION_DRAFTS_ENABLED).toBe(false)
    render(<MemoryRouter initialEntries={['/content-author/ai-drafts?new=questions']}><Page /></MemoryRouter>)
    expect(screen.getByText('Tính năng đang chờ triển khai')).toBeInTheDocument()
    expect(screen.queryByRole('form')).not.toBeInTheDocument()
    Object.values(api).forEach((method) => expect(method).not.toHaveBeenCalled())
    expect(knowledge.fetchKnowledgeTree).not.toHaveBeenCalled()
  })
})
