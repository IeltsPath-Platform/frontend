import { useState } from 'react'
import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { PackageListItem } from '../../packages/types'
import { CourseDraftCatalogContext } from '../lib/courseDraftCatalog'
import type { CoursePracticeSet, CourseSetQuestion } from '../types'
import { CoursePackagePicker } from './CoursePackagePicker'

const api = vi.hoisted(() => ({ listFittingPracticeSets: vi.fn() }))
vi.mock('../../packages/api/packageApi', () => ({ getPackage: vi.fn() }))
vi.mock('../api/courseDraftApi', () => api)
vi.mock('../../ai-drafts/api/aiDraftApi', () => ({ requestPracticeSetDraft: vi.fn(), getPracticeSetDraft: vi.fn() }))

const set = (id: string, code: string, title: string) => ({ id, code, title, lessonId: null, courseId: null }) as unknown as PackageListItem
const free = set('a', 'PS_FREE_1', 'Tìm ý chính')
const other = set('c', 'PS_FREE_2', 'Đọc lướt đoạn văn')
const taken = set('b', 'PS_TAKEN', 'Gói đã dùng')
const catalog = { status: 'success' as const, data: [taken, free, other], error: null, reload: vi.fn(), refresh: vi.fn() }
const point = '11111111-1111-4111-8111-111111111111'

const idle = { status: 'success' as const, data: null, error: null, reload: vi.fn(), refresh: vi.fn() }
const knowledgeOf = (skill: string) => ({ ...idle, data: { nodes: [{ id: point, code: 'DR_TOPIC_SENTENCE', name: 'Câu chủ đề', skill }] } }) as unknown as typeof idle
const question = (stem: string, correct: string): CourseSetQuestion => ({
  stem, options: [{ optionKey: 'A', content: 'First' }, { optionKey: 'B', content: 'Second' }], correctKey: correct, explanation: 'It says so in the passage.', difficulty: 'MEDIUM',
})
const aiSet = (questions = 3): CoursePracticeSet => ({
  title: 'Topic sentences', instructions: 'Read and answer.', passage: 'A. Gardens help.', questionType: 'MULTIPLE_CHOICE', knowledgePointIds: [point],
  questions: Array.from({ length: questions }, (_, index) => question(`Question ${index + 1}?`, index % 2 ? 'B' : 'A')),
})

function Harness({ usedIds = [], start = [], points = [point], sets = [], skill = 'READING' }: {
  usedIds?: string[]; start?: string[]; points?: string[]; sets?: CoursePracticeSet[]; skill?: string
}) {
  const [value, setValue] = useState<string[]>(start)
  const [newSets, setNewSets] = useState<CoursePracticeSet[]>(sets)
  return <CourseDraftCatalogContext.Provider value={{ knowledge: knowledgeOf(skill), questions: idle as never, bandLevel: 6.5 }}>
    <CoursePackagePicker catalog={catalog} disabled={false} knowledgePointIds={points} lessonTitle="Bài 1" newSets={newSets} newWordLemmas={[]} onChange={setValue}
      onNewSetsChange={setNewSets} usedIds={usedIds} value={value} vocabularySenseIds={[]} />
  </CourseDraftCatalogContext.Provider>
}

function openChooser() {
  fireEvent.click(screen.getByRole('button', { name: /Chọn gói luyện tập|Sửa lựa chọn/ }))
  return screen.getByRole('dialog', { name: 'Chọn gói luyện tập' })
}

describe('CoursePackagePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    api.listFittingPracticeSets.mockResolvedValue([])
  })

  it('lists the sets that can be ticked first and groups the ones another lesson uses below them', () => {
    render(<Harness usedIds={['b']} />)
    const dialog = openChooser()

    const boxes = within(dialog).getAllByRole('checkbox')
    expect(boxes.map((box) => (box as HTMLInputElement).disabled)).toEqual([false, false, true])
    expect(boxes[2]).toHaveAccessibleName(/PS_TAKEN/)
    expect(within(dialog).getAllByText('Đã dùng ở bài khác trong bản nháp')).toHaveLength(1)

    fireEvent.click(boxes[0]!)
    expect(within(dialog).getByText('1/20 đã chọn')).toBeTruthy()
  })

  it('shows no group heading when no set is used elsewhere, and reads a set with an icon button', () => {
    render(<Harness />)
    const dialog = openChooser()

    expect(within(dialog).queryByText('Đã dùng ở bài khác trong bản nháp')).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Xem chi tiết gói PS_FREE_1 trong hộp chọn' })).toBeTruthy()
  })

  const codesOf = (dialog: HTMLElement) => within(dialog).getAllByRole('checkbox').map((box) => box.closest('li')?.querySelector('code')?.textContent)

  it('offers only the sets that measure the lesson\'s knowledge points, and shows the rest on request', async () => {
    api.listFittingPracticeSets.mockResolvedValue(['c'])
    render(<Harness />)
    await waitFor(() => expect(api.listFittingPracticeSets).toHaveBeenCalledWith([point], expect.anything()))
    const dialog = openChooser()

    await within(dialog).findByText('Khớp điểm kiến thức')
    expect(codesOf(dialog)).toEqual(['PS_FREE_2'])
    expect(within(dialog).getAllByText('Khớp điểm kiến thức')).toHaveLength(1)
    expect((within(dialog).getByRole('checkbox') as HTMLInputElement).disabled).toBe(false)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Hiện thêm 2 gói không khớp điểm kiến thức' }))
    expect(codesOf(dialog)).toEqual(['PS_FREE_2', 'PS_TAKEN', 'PS_FREE_1'])
    expect(within(dialog).getAllByText('Khớp điểm kiến thức')).toHaveLength(1)

    fireEvent.click(within(dialog).getByRole('button', { name: 'Chỉ hiện gói khớp điểm kiến thức' }))
    expect(codesOf(dialog)).toEqual(['PS_FREE_2'])
  })

  it('keeps an attached set in the list even when it does not fit, so it can be unticked', async () => {
    api.listFittingPracticeSets.mockResolvedValue(['c'])
    render(<Harness start={['a']} />)
    await waitFor(() => expect(api.listFittingPracticeSets).toHaveBeenCalled())
    const dialog = openChooser()

    await within(dialog).findByText('Khớp điểm kiến thức')
    expect(codesOf(dialog)).toEqual(['PS_FREE_2', 'PS_FREE_1'])
  })

  it('flags an attached set that measures none of the lesson\'s points', async () => {
    api.listFittingPracticeSets.mockResolvedValue(['a'])
    render(<Harness start={['a', 'c']} />)

    const table = await screen.findByRole('table', { name: 'Gói luyện tập đã chọn' })
    const flagged = await within(table).findByText('Không khớp điểm kiến thức')
    expect(flagged.closest('tr')).toHaveTextContent('PS_FREE_2')
    expect(within(table).getAllByText('Không khớp điểm kiến thức')).toHaveLength(1)
  })

  it('shows no fit hints when the lesson has no knowledge points or the check fails', async () => {
    const { unmount } = render(<Harness points={[]} start={['a']} />)
    const table = await screen.findByRole('table', { name: 'Gói luyện tập đã chọn' })
    expect(within(table).queryByText('Không khớp điểm kiến thức')).toBeNull()
    expect(within(openChooser()).getByText('Bài chưa chọn điểm kiến thức nên chưa gợi ý được gói khớp.')).toBeTruthy()
    unmount()

    api.listFittingPracticeSets.mockRejectedValue(new Error('down'))
    render(<Harness start={['a']} />)
    await waitFor(() => expect(api.listFittingPracticeSets).toHaveBeenCalled())
    expect(screen.queryByText('Không khớp điểm kiến thức')).toBeNull()
    const dialog = openChooser()
    expect(within(dialog).queryByText('Khớp điểm kiến thức')).toBeNull()
    expect(await within(dialog).findByText('Chưa kiểm tra được gói nào khớp điểm kiến thức của bài.')).toBeTruthy()
  })

  it('says so when the check worked and no set fits, and points to writing one with AI', async () => {
    api.listFittingPracticeSets.mockResolvedValue([])
    render(<Harness />)
    const dialog = openChooser()

    expect(await within(dialog).findByText(/Không có gói nào khớp điểm kiến thức của bài\./)).toBeTruthy()
    expect(within(dialog).queryByText('Khớp điểm kiến thức')).toBeNull()
    expect(within(dialog).queryAllByRole('checkbox')).toHaveLength(0)

    fireEvent.click(within(dialog).getByRole('button', { name: /Hiện thêm \d+ gói không khớp điểm kiến thức/ }))
    expect(within(dialog).getAllByRole('checkbox').length).toBeGreaterThan(0)
  })

  it('opens the AI generator from the empty list', async () => {
    api.listFittingPracticeSets.mockResolvedValue([])
    render(<Harness />)
    const dialog = openChooser()

    fireEvent.click(await within(dialog).findByRole('button', { name: 'tạo gói luyện bằng AI' }))

    expect(await screen.findByRole('dialog', { name: 'Tạo gói luyện bằng AI' })).toBeTruthy()
    expect(screen.queryByRole('dialog', { name: 'Chọn gói luyện tập' })).toBeNull()
  })

  describe('sets the model wrote', () => {
    it('lists them in the same table as a draft the author can read, and counts them with the chosen sets', async () => {
      render(<Harness sets={[aiSet()]} start={['a']} />)

      const table = await screen.findByRole('table', { name: 'Gói luyện tập đã chọn' })
      const row = within(table).getByText('Topic sentences').closest('tr') as HTMLElement
      expect(within(row).getByText('AI viết · nháp')).toBeTruthy()
      expect(within(row).getByText('3 câu')).toBeTruthy()
      expect(within(row).getByText('2')).toBeTruthy()
      expect(screen.getByText('2/20')).toBeTruthy()

      fireEvent.click(within(row).getByRole('button', { name: 'Xem chi tiết gói AI viết 1' }))
      const dialog = await screen.findByRole('dialog', { name: 'Topic sentences' })
      expect(within(dialog).getByText('A. Gardens help.')).toBeTruthy()
      expect(within(dialog).getByText(/Question 1\?/)).toBeTruthy()
      expect(within(dialog).getAllByText('Đáp án đúng')).toHaveLength(3)
    })

    it('removes a whole set from the table', async () => {
      render(<Harness sets={[aiSet()]} />)
      const table = await screen.findByRole('table', { name: 'Gói luyện tập đã chọn' })

      fireEvent.click(within(table).getByRole('button', { name: 'Gỡ gói AI viết 1' }))

      expect(within(table).queryByText('Topic sentences')).toBeNull()
      expect(within(table).getByText('Chưa gắn gói luyện tập nào.')).toBeTruthy()
    })

    it('drops a question from the detail only while the set keeps three', async () => {
      render(<Harness sets={[aiSet(4)]} />)
      fireEvent.click(await screen.findByRole('button', { name: 'Xem chi tiết gói AI viết 1' }))
      const dialog = await screen.findByRole('dialog', { name: 'Topic sentences' })

      fireEvent.click(within(dialog).getByRole('button', { name: 'Gỡ câu 4 khỏi gói' }))

      expect(within(dialog).queryByText(/Question 4\?/)).toBeNull()
      expect(within(dialog).getAllByText('Gói cần ít nhất 3 câu.', { exact: false }).length).toBeGreaterThan(0)
      for (const button of within(dialog).getAllByRole('button', { name: /Gỡ câu \d khỏi gói/ })) expect((button as HTMLButtonElement).disabled).toBe(true)
    })

    it('offers the AI button only for a lesson with a reading knowledge point and room for one more set', async () => {
      const { unmount } = render(<Harness />)
      expect((await screen.findByRole('button', { name: 'Tạo gói luyện bằng AI' }) as HTMLButtonElement).disabled).toBe(false)
      unmount()

      render(<Harness skill="LISTENING" />)
      expect((await screen.findByRole('button', { name: 'Tạo gói luyện bằng AI' }) as HTMLButtonElement).disabled).toBe(true)
    })

    it('stops offering the AI button at three sets', async () => {
      render(<Harness sets={[aiSet(), aiSet(), aiSet()]} />)

      expect((await screen.findByRole('button', { name: 'Tạo gói luyện bằng AI' }) as HTMLButtonElement).disabled).toBe(true)
    })
  })
})
