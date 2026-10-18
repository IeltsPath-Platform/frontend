import type { ReadingMode, ReadingTestCard } from '../reading/readingPracticeApi'

export function buildReadingAttemptRequest(
  test: Pick<ReadingTestCard, 'scope' | 'packageVersionId' | 'parts'>,
  mode: ReadingMode,
  partNo?: number,
) {
  const selectedPart = test.scope === 'PART' ? test.parts.find((part) => part.partNo === partNo) ?? test.parts[0] : null
  return {
    packageVersionId: test.packageVersionId,
    ...(selectedPart ? { sectionIds: [selectedPart.sectionId] } : {}),
    mode: mode === 'exam' ? 'TIMED' as const : 'STANDARD' as const,
    channel: 'WEB' as const,
  }
}
