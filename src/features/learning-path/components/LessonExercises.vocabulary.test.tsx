import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/toast/ToastProvider'
import type { LessonBlock } from '~types/learningPath'
import { LessonExercises } from './LessonExercises'

const { getHearts } = vi.hoisted(() => ({ getHearts: vi.fn() }))
vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()), learningApi: { getHearts },
}))

const audio: LessonBlock = { id: 'audio', type: 'ASSET', assetType: 'AUDIO', sortOrder: 1, mediaUrl: 'https://example.test/listening.mp3', durationSeconds: 60, transcript: null }
const vocabulary: LessonBlock = { id: 'vocab', type: 'VOCABULARY', sortOrder: 2, vocabularySenseIds: ['sense-1'] }
const exercise: LessonBlock = {
  id: 'exercise', type: 'EXERCISE', sortOrder: 3, title: 'Bài tập 1', instructions: 'Answer the question', knowledgePointCode: '',
  questions: [{ id: 'question-1', number: 1, prompt: 'Which word?', options: null }],
  state: 'NOT_ATTEMPTED', savedAnswers: null, solutions: null,
}

beforeEach(() => { getHearts.mockResolvedValue(null) })

describe('vocabulary alongside lesson exercises', () => {
  it('renders audio and questions without treating vocabulary as a reading passage', () => {
    render(<ToastProvider><LessonExercises lessonId="lesson-1" blocks={[audio, vocabulary, exercise]} onChanged={vi.fn()} /></ToastProvider>)
    expect(screen.getByRole('region', { name: 'Bài nghe' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bài tập 1' })).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Bài đọc và bài tập' })).not.toBeInTheDocument()
  })

  it('does not turn vocabulary alone into a completion exercise', () => {
    render(<ToastProvider><LessonExercises lessonId="lesson-1" blocks={[vocabulary]} onChanged={vi.fn()} /></ToastProvider>)
    expect(screen.getByText(/Bài học này chưa có bài tập/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
