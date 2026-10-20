import { describe, expect, it } from 'vitest'
import { mapPracticeAttemptView, type PracticeAttemptViewDto } from './learningAdapters'

// The shape learning-service sends for a Practice set made of essays: they sit in sections[].essays.
const essayOnlyAttempt: PracticeAttemptViewDto = {
  attemptId: 'attempt-1',
  packageId: 'package-1',
  packageVersionId: 'version-1',
  passage: null,
  audio: null,
  questions: [],
  sections: [
    {
      essays: [
        {
          questionVersionId: 'essay-2',
          sortOrder: 2,
          stem: 'Second prompt',
          task: 'TASK_2',
          minWords: 250,
          passBand: 5.5,
          latestSubmission: { id: 'submission-1', status: 'GRADED', overallBand: 6, passed: true },
        },
        { questionVersionId: 'essay-1', sortOrder: 1, stem: 'First prompt', task: 'TASK_1', minWords: 150, passBand: 5.5 },
      ],
    },
  ],
}

describe('mapPracticeAttemptView', () => {
  it('reads the essays from the sections, in order, with their newest submission', () => {
    const view = mapPracticeAttemptView(essayOnlyAttempt)

    expect(view.questions).toEqual([])
    expect(view.essays.map((essay) => essay.id)).toEqual(['essay-1', 'essay-2'])
    expect(view.essays[0]).toMatchObject({ prompt: 'First prompt', task: 'TASK_1', minWords: 150, passBand: 5.5, latest: null })
    expect(view.essays[1].latest).toEqual({ id: 'submission-1', status: 'GRADED', overallBand: 6, passed: true })
  })

  it('has no essays when the set has only questions', () => {
    expect(mapPracticeAttemptView({ ...essayOnlyAttempt, sections: [{ essays: [] }] }).essays).toEqual([])
    expect(mapPracticeAttemptView({ ...essayOnlyAttempt, sections: undefined }).essays).toEqual([])
  })
})
