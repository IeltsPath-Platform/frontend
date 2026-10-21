import { describe, expect, it } from 'vitest'
import { mapLessonBlocks, mapLessonDetail, mapLessonExerciseResult } from './learningAdapters'

const QUESTION_A = '10000000-0000-4000-8000-000000000001'
const QUESTION_B = '10000000-0000-4000-8000-000000000002'

describe('lesson blocks', () => {
  it('retains ordered vocabulary IDs without counting them as exercises', () => {
    const blocks = mapLessonBlocks([
      { blockId: 'second-exercise', blockType: 'EXERCISE', sortOrder: 4, questions: [] },
      { blockId: 'vocabulary', blockType: 'VOCABULARY', sortOrder: 2, vocabularySenseIds: ['sense-b', 'sense-a', 'sense-b'] },
      { blockId: 'first-exercise', blockType: 'EXERCISE', sortOrder: 1, questions: [] },
      { blockId: 'empty-vocabulary', blockType: 'VOCABULARY', sortOrder: 3, vocabularySenseIds: null },
    ])

    expect(blocks.map((block) => block.id)).toEqual(['first-exercise', 'vocabulary', 'empty-vocabulary', 'second-exercise'])
    expect(blocks[1]).toMatchObject({ type: 'VOCABULARY', vocabularySenseIds: ['sense-b', 'sense-a', 'sense-b'] })
    expect(blocks[2]).toMatchObject({ type: 'VOCABULARY', vocabularySenseIds: [] })
    expect(blocks.filter((block) => block.type === 'EXERCISE').map((block) => block.title)).toEqual(['Bài tập 1', 'Bài tập 2'])
  })

  it('keeps passages, audio and auto-graded exercises in order and leaves the rest out', () => {
    const blocks = mapLessonBlocks([
      {
        blockId: 'exercise', blockType: 'EXERCISE', blockKind: 'EXERCISE', sortOrder: 3, passed: false,
        questions: [
          { questionVersionId: QUESTION_B, sortOrder: 2, stem: 'Second', options: null },
          { questionVersionId: QUESTION_A, sortOrder: 1, stem: 'First', options: [{ optionKey: 'A', content: 'x', sortOrder: 1 }] },
        ],
      },
      { blockId: 'text', blockType: 'TEXT', sortOrder: 1 },
      { blockId: 'passage', blockType: 'ASSET', sortOrder: 2, asset: { assetType: 'PASSAGE', textContent: 'A. One\n\nB. Two' } },
      { blockId: 'essay', blockType: 'EXERCISE', blockKind: 'ESSAY', sortOrder: 4 },
      { blockId: 'audio', blockType: 'ASSET', sortOrder: 5, asset: { assetType: 'AUDIO', mediaUrl: 'https://cdn.example/a.mp3', durationSeconds: 61 } },
    ])

    expect(blocks.map((block) => block.id)).toEqual(['passage', 'exercise', 'audio'])
    const exercise = blocks[1]
    expect(exercise.type).toBe('EXERCISE')
    if (exercise.type === 'EXERCISE') {
      expect((exercise as { title: string }).title).toBe('Bài tập 1')
      expect((exercise as { questions: Array<{ id: string }> }).questions.map((question) => question.id)).toEqual([QUESTION_A, QUESTION_B])
      expect((exercise as { state: string }).state).toBe('NOT_ATTEMPTED')
      expect((exercise as { solutions: unknown }).solutions).toBeNull()
    }
  })

  it('shows the answers of an exercise the learner already passed', () => {
    const [block] = mapLessonBlocks([{
      blockId: 'exercise', blockType: 'EXERCISE', sortOrder: 1, passed: true,
      questions: [{ questionVersionId: QUESTION_A, sortOrder: 1, stem: 'First', options: null }],
      solutions: [{ questionVersionId: QUESTION_A, correctAnswer: 'critics', explanation: 'Paragraph D' }],
    }])

    const exercise = block as unknown as { state: string; savedAnswers: Record<string, string>; solutions: Array<{ correctAnswer?: string }> }
    expect(exercise.state).toBe('PASSED')
    expect(exercise.savedAnswers).toEqual({ [QUESTION_A]: 'critics' })
    expect(exercise.solutions[0].correctAnswer).toBe('critics')
  })

  it('maps a lesson without blocks to an empty list', () => {
    const lesson = mapLessonDetail({
      lessonId: 'l1', topicId: 't1', code: 'L1', title: 'Lesson', sortOrder: 1, status: 'AVAILABLE',
    }, 'Topic')

    expect(lesson.blocks).toEqual([])
  })

  it('maps the verdict of a submitted exercise and whether it completed the lesson', () => {
    const result = mapLessonExerciseResult({
      blockPassed: true,
      lessonCompleted: true,
      results: [{ questionVersionId: QUESTION_A, correct: true, correctAnswer: 'A', explanation: 'Why' }],
      gamification: null,
    })

    expect(result.blockPassed).toBe(true)
    expect(result.lessonCompleted).toBe(true)
    expect(result.results[0]).toMatchObject({ questionId: QUESTION_A, correct: true, correctAnswer: 'A' })
    expect(result.gamification).toBeNull()
  })
})
