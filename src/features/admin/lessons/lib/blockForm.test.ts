import { describe, expect, it } from 'vitest'
import type { LessonBlock } from '../types'
import { buildBlockRequest, initialBlockState, moveId } from './blockForm'

const ASSET_ID = '7a000000-0000-4000-8000-000000000001'

describe('buildBlockRequest', () => {
  it('needs text for a TEXT block and carries its knowledge points', () => {
    const empty = buildBlockRequest({ ...initialBlockState('TEXT'), textContent: '  ' })
    expect(empty.ok).toBe(false)

    const ok = buildBlockRequest({ ...initialBlockState('TEXT'), textContent: '# Skimming', knowledgePointIds: ['kp1'] })
    expect(ok).toEqual({ ok: true, body: { blockType: 'TEXT', textContent: '# Skimming', knowledgePointIds: ['kp1'] } })
  })

  it('needs a valid asset id for an ASSET block', () => {
    expect(buildBlockRequest({ ...initialBlockState('ASSET'), assetId: 'not-a-uuid' }).ok).toBe(false)
    expect(buildBlockRequest({ ...initialBlockState('ASSET'), assetId: ` ${ASSET_ID} ` }))
      .toEqual({ ok: true, body: { blockType: 'ASSET', assetId: ASSET_ID } })
  })

  it('needs one to one hundred vocabulary senses', () => {
    expect(buildBlockRequest(initialBlockState('VOCABULARY')).ok).toBe(false)
    expect(buildBlockRequest({ ...initialBlockState('VOCABULARY'), senseIds: ['s1', 's2'] }))
      .toEqual({ ok: true, body: { blockType: 'VOCABULARY', vocabularySenseIds: ['s1', 's2'] } })
    const tooMany = Array.from({ length: 101 }, (_, index) => `s${index}`)
    expect(buildBlockRequest({ ...initialBlockState('VOCABULARY'), senseIds: tooMany }).ok).toBe(false)
  })

  it('needs a question for an EXERCISE block', () => {
    expect(buildBlockRequest(initialBlockState('EXERCISE')).ok).toBe(false)
    expect(buildBlockRequest({ ...initialBlockState('EXERCISE'), questionVersionIds: ['v1'] }))
      .toEqual({ ok: true, body: { blockType: 'EXERCISE', questionVersionIds: ['v1'] } })
  })
})

describe('initialBlockState', () => {
  it('starts from an existing block', () => {
    const block: LessonBlock = {
      id: 'b1', blockType: 'EXERCISE', sortOrder: 1, textContent: null, assetId: null, vocabularySenseIds: [],
      knowledgePointIds: [], questions: [{ questionVersionId: 'v9' }],
    }
    expect(initialBlockState('EXERCISE', block).questionVersionIds).toEqual(['v9'])
  })
})

describe('moveId', () => {
  it('moves an item one place', () => {
    expect(moveId(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(moveId(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b'])
  })

  it('leaves an item at the edge, or an unknown one, where it is', () => {
    expect(moveId(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
    expect(moveId(['a', 'b'], 'b', 1)).toEqual(['a', 'b'])
    expect(moveId(['a', 'b'], 'x', 1)).toEqual(['a', 'b'])
  })
})
