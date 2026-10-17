import test from 'node:test'
import assert from 'node:assert/strict'
import { buildReadingAttemptRequest } from '../src/features/practice/lib/attemptRequest.ts'

const parts = [1, 2, 3].map((partNo) => ({ sectionId: `section-${partNo}`, partNo, title: `Passage ${partNo}`, questionCount: 5, formats: [] }))

test('PART attempt sends only the selected section and actual attempt mode', () => {
  assert.deepEqual(buildReadingAttemptRequest({ scope: 'PART', packageVersionId: 'version-1', parts }, 'exam', 2), {
    packageVersionId: 'version-1', sectionIds: ['section-2'], mode: 'TIMED', channel: 'WEB',
  })
})

test('FULL attempt omits sectionIds so the backend determines full scope', () => {
  assert.deepEqual(buildReadingAttemptRequest({ scope: 'FULL', packageVersionId: 'version-1', parts }, 'practice'), {
    packageVersionId: 'version-1', mode: 'STANDARD', channel: 'WEB',
  })
})
