import { fireEvent, render, screen, waitFor } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { KnowledgePointDrawer } from './KnowledgePointDrawer'

const { points, settings, topics } = vi.hoisted(() => ({
  points: { fetchKnowledgePoints: vi.fn(), fetchPrerequisites: vi.fn(), createKnowledgePoint: vi.fn(), updateKnowledgePoint: vi.fn(), replacePrerequisites: vi.fn() },
  settings: { fetchCodeSettings: vi.fn(), fetchCodeSuggestion: vi.fn() },
  topics: { fetchTopics: vi.fn() },
}))
vi.mock('../api/knowledgePointApi', () => points)
vi.mock('../../code-settings/api/codeSettingsApi', () => settings)
vi.mock('../../lessons/api/lessonApi', () => topics)

function renderDrawer() {
  return render(<KnowledgePointDrawer node={null} topics={[{ id: 'topic-1', code: 'READING_1', name: 'Reading', skill: 'READING', courseId: null, status: 'ACTIVE', sortOrder: 1 }]} onClose={vi.fn()} onSaved={vi.fn()} />)
}

async function fillRequiredFields() {
  fireEvent.change(await screen.findByLabelText('Tên'), { target: { value: 'Read short texts' } })
  fireEvent.change(screen.getByLabelText('Chủ đề'), { target: { value: 'topic-1' } })
  fireEvent.click(screen.getByRole('radio', { name: 'Grammar' }))
  fireEvent.click(screen.getByRole('radio', { name: 'Concept' }))
  fireEvent.change(screen.getByLabelText('Can-do'), { target: { value: 'Read short texts accurately.' } })
}

describe('KnowledgePointDrawer generated codes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    points.fetchKnowledgePoints.mockResolvedValue([])
    points.fetchPrerequisites.mockResolvedValue([])
    points.createKnowledgePoint.mockResolvedValue({ id: 'new-id', topicId: 'topic-1', code: 'R55_READ_SHORT_TEXTS', name: 'Read short texts', kind: 'STRATEGY', learningType: 'CONCEPT', skill: 'READING', status: 'ACTIVE' })
    points.replacePrerequisites.mockResolvedValue(undefined)
    topics.fetchTopics.mockResolvedValue([])
    settings.fetchCodeSettings.mockResolvedValue([{ kind: 'KNOWLEDGE_POINT', applied: true, pattern: '{PREFIX}{LEVEL}_{NAME}', startNumber: 1, editable: false }])
    settings.fetchCodeSuggestion.mockImplementation(async (context) => ({ code: `R${context.level}_${context.name.toUpperCase().replaceAll(' ', '_')}`, applied: true, editable: false }))
  })

  it('updates the suggestion from the form context, keeps a typed code, and puts code first', async () => {
    renderDrawer()
    const code = await screen.findByLabelText('Mã')
    const level = await screen.findByRole('group', { name: /Mức band/ })
    expect(code.compareDocumentPosition(level) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    fireEvent.click(screen.getByRole('radio', { name: 'Grammar' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Reading' }))
    fireEvent.click(screen.getByRole('radio', { name: '5.5' }))
    fireEvent.change(screen.getByLabelText('Tên'), { target: { value: 'Read texts' } })

    await waitFor(() => expect(code).toHaveValue('R55_READ_TEXTS'))
    fireEvent.change(code, { target: { value: 'CUSTOM_CODE' } })
    fireEvent.change(screen.getByLabelText('Tên'), { target: { value: 'Read passages' } })
    await waitFor(() => expect(settings.fetchCodeSuggestion).toHaveBeenCalledWith(
      expect.objectContaining({ kpKind: 'GRAMMAR', skill: 'READING', level: 55, name: 'Read passages' }), expect.any(AbortSignal),
    ))
    expect(code).toHaveValue('CUSTOM_CODE')
  })

  it('hides the level when generation is off and preserves manual code validation', async () => {
    settings.fetchCodeSettings.mockResolvedValue([{ kind: 'KNOWLEDGE_POINT', applied: false, pattern: '{PREFIX}{LEVEL}_{NAME}', startNumber: 1, editable: true }])
    renderDrawer()
    await screen.findByLabelText('Mã')
    expect(screen.queryByLabelText('Mức band')).not.toBeInTheDocument()
    expect(settings.fetchCodeSuggestion).not.toHaveBeenCalled()
    await fillRequiredFields()
    fireEvent.change(screen.getByLabelText('Mã'), { target: { value: 'R55_READ_SHORT_TEXTS' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Điểm kiến thức mới' }))
    await waitFor(() => expect(points.createKnowledgePoint).toHaveBeenCalledWith(expect.objectContaining({ code: 'R55_READ_SHORT_TEXTS' })))
    expect(points.createKnowledgePoint.mock.calls[0]?.[0]).not.toHaveProperty('codeLevel')
  })

  it('locks code, sends no code field, and includes the selected code level', async () => {
    renderDrawer()
    await screen.findByLabelText('Mã')
    fireEvent.click(screen.getByRole('radio', { name: 'Grammar' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Reading' }))
    fireEvent.click(screen.getByRole('radio', { name: '5.5' }))
    fireEvent.change(await screen.findByLabelText('Tên'), { target: { value: 'Read short texts' } })
    await waitFor(() => expect(screen.getByLabelText('Mã')).toHaveValue('R55_READ_SHORT_TEXTS'))
    expect(screen.getByLabelText('Mã')).toBeDisabled()
    await fillRequiredFields()
    fireEvent.submit(screen.getByRole('form', { name: 'Điểm kiến thức mới' }))
    await waitFor(() => expect(points.createKnowledgePoint).toHaveBeenCalled())
    expect(points.createKnowledgePoint.mock.calls[0]?.[0]).not.toHaveProperty('code')
    expect(points.createKnowledgePoint.mock.calls[0]?.[0]).toHaveProperty('codeLevel', 55)
  })

  it('shows a field error when a generated suggestion does not match the code rule', async () => {
    settings.fetchCodeSuggestion.mockResolvedValue({ code: 'BAD-CODE', applied: true, editable: true })
    renderDrawer()
    await screen.findByLabelText('Mã')
    fireEvent.click(screen.getByRole('radio', { name: 'Grammar' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Reading' }))
    fireEvent.click(screen.getByRole('radio', { name: '5.5' }))
    fireEvent.change(await screen.findByLabelText('Tên'), { target: { value: 'Read short texts' } })
    await waitFor(() => expect(screen.getByLabelText('Mã')).toHaveValue('BAD-CODE'))
    await fillRequiredFields()
    fireEvent.submit(screen.getByRole('form', { name: 'Điểm kiến thức mới' }))
    expect(await screen.findByText(/Mã phải có dạng/)).toBeInTheDocument()
    expect(points.createKnowledgePoint).not.toHaveBeenCalled()
  })
})
