import type { Rubric, RubricRequest } from '../types'

export function rubricRequest(rubric: Rubric): RubricRequest {
  return {
    code: rubric.code, task: rubric.task, version: rubric.version, sourceNote: rubric.sourceNote,
    systemPrompt: rubric.systemPrompt ?? '',
    criteria: rubric.criteria.map((criterion) => ({ code: criterion.code, name: criterion.name, description: criterion.description, sortOrder: criterion.sortOrder, bandDescriptors: criterion.bandDescriptors.map((item) => ({ ...item })) })),
    examples: rubric.examples.map((example) => ({ ...example })),
  }
}

export function rubricDraft(active: Rubric, existing: readonly Rubric[]): RubricRequest {
  return { ...rubricRequest(active), version: Math.max(active.version, ...existing.map((item) => item.version)) + 1 }
}

export function activationProblem(rubric: RubricRequest): string | null {
  if (rubric.task === 'SPEAKING') {
    const expected = ['FC', 'LR', 'GRA', 'PR']
    if (rubric.criteria.length !== 4 || !expected.every((code) => rubric.criteria.some((item) => item.code === code))) return 'Để kích hoạt, cần đủ FC, LR, GRA và PR.'
    if (rubric.criteria.some((criterion) => criterion.bandDescriptors.length !== 19 || Array.from({ length: 19 }, (_, index) => index * 0.5).some((band) => !criterion.bandDescriptors.some((item) => item.band === band)))) return 'Để kích hoạt rubric Speaking, mỗi tiêu chí cần đủ mô tả band 0,0 đến 9,0 theo bước 0,5.'
    return null
  }
  const expected = [rubric.task === 'TASK_1' ? 'TA' : 'TR', 'CC', 'LR', 'GRA']
  if (rubric.criteria.length !== 4 || !expected.every((code) => rubric.criteria.some((item) => item.code === code))) return `Để kích hoạt, cần đúng các tiêu chí ${expected.join(', ')}.`
  if (rubric.criteria.some((criterion) => criterion.bandDescriptors.length !== 11 || Array.from({ length: 11 }, (_, index) => 4 + index * 0.5).some((band) => !criterion.bandDescriptors.some((item) => item.band === band)))) return 'Để kích hoạt, mỗi tiêu chí cần đủ mô tả band 4,0 đến 9,0 theo bước 0,5.'
  return null
}
