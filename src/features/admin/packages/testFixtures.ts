import type { ContentPackage, PackageSection, PackageVersion, SectionRequest } from './types'

export const packageId = '00000000-0000-4000-8000-000000000001'
export const draftId = '00000000-0000-4000-8000-000000000002'
export const publishedId = '00000000-0000-4000-8000-000000000003'
export const sectionId = '00000000-0000-4000-8000-000000000004'
export const nextSectionId = '00000000-0000-4000-8000-000000000005'
export const coverId = '00000000-0000-4000-8000-000000000006'
export const section: PackageSection = {
  id: sectionId, title: 'Reading One', skill: 'READING', sortOrder: 4,
  timeLimitSeconds: 91, partNo: 2, coverAssetId: coverId, instructions: 'Read carefully.',
  questions: [{ id: '00000000-0000-4000-8000-000000000007', questionVersionId: '00000000-0000-4000-8000-000000000008', sortOrder: 1, maxScore: 2.5 }],
}
export const sectionRequest: SectionRequest = {
  title: section.title, skill: section.skill, sortOrder: section.sortOrder,
  timeLimitSeconds: section.timeLimitSeconds, partNo: section.partNo,
  coverAssetId: section.coverAssetId, instructions: section.instructions,
}
export const draft: PackageVersion = {
  id: draftId, versionNumber: 2, status: 'DRAFT', rulesJson: '{}',
  publishedAt: null, publishAt: null, lastPublishError: null, sections: [section],
}
export const published: PackageVersion = {
  ...draft, id: publishedId, versionNumber: 1, status: 'PUBLISHED',
  publishedAt: '2026-10-23T00:00:00Z', sections: [],
}
export function makePackage(versions: PackageVersion[] = [published, draft]): ContentPackage {
  return {
    id: packageId, code: 'READING-PRACTICE-1', title: 'Reading practice', packageType: 'PRACTICE_SET',
    accessLevel: 'FREE', status: 'PUBLISHED', currentPublishedVersionId: publishedId,
    lessonId: null, courseId: null, sourceCode: null, createdAt: '2026-10-23T00:00:00Z',
    updatedAt: '2026-10-23T00:00:00Z', versions,
  }
}
