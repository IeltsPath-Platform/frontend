import { describe, it, expect } from 'vitest'
import {
  adminItemSchema,
  adminSenseSchema,
  adminTopicSchema,
  adminSetSchema,
  collocationSchema,
  relationSchema,
  commonMistakeSchema,
  exampleSchema,
} from './vocabularySchemas'

describe('vocabularySchemas', () => {
  it('validates adminItemSchema correctly', () => {
    const valid = {
      ipaUk: '/tɪkst/',
      ipaUs: '/tɛkst/',
      frequencyRank: 120,
      academicWordList: true,
      wordFamily: 'textual, textually',
    }
    const result = adminItemSchema.safeParse(valid)
    expect(result.success).toBe(true)

    const invalidRank = { frequencyRank: -5 }
    expect(adminItemSchema.safeParse(invalidRank).success).toBe(false)
  })

  it('validates adminSenseSchema correctly', () => {
    const valid = {
      cefrLevel: 'B2',
      register: 'Formal',
      grammarNote: 'Countable noun',
      usageNote: 'Common in IELTS academic writing',
    }
    expect(adminSenseSchema.safeParse(valid).success).toBe(true)

    const invalidCefr = { cefrLevel: 'Z9' }
    expect(adminSenseSchema.safeParse(invalidCefr).success).toBe(false)
  })

  it('validates adminTopicSchema correctly', () => {
    const valid = {
      slug: 'environment',
      name: 'Environment',
      nameVi: 'Môi trường',
      sortOrder: 1,
      status: 'ACTIVE',
    }
    expect(adminTopicSchema.safeParse(valid).success).toBe(true)

    const invalid = {
      slug: 'a', // too short
      name: '',
      nameVi: '',
    }
    expect(adminTopicSchema.safeParse(invalid).success).toBe(false)
  })

  it('validates adminSetSchema correctly', () => {
    const valid = {
      title: 'Vocabulary Band 6.5 - 7.5',
      kind: 'BAND',
      cefrLevel: 'B2',
      sortOrder: 2,
      status: 'ACTIVE',
    }
    expect(adminSetSchema.safeParse(valid).success).toBe(true)

    const invalid = {
      title: '',
      kind: 'INVALID',
    }
    expect(adminSetSchema.safeParse(invalid).success).toBe(false)
  })

  it('validates collocationSchema correctly', () => {
    expect(collocationSchema.safeParse({ phrase: 'make a decision' }).success).toBe(true)
    expect(collocationSchema.safeParse({ phrase: '' }).success).toBe(false)
  })

  it('validates relationSchema correctly', () => {
    expect(relationSchema.safeParse({ relatedLemma: 'significant', kind: 'SYNONYM' }).success).toBe(true)
    expect(relationSchema.safeParse({ relatedLemma: '', kind: 'UNKNOWN' }).success).toBe(false)
  })

  it('validates commonMistakeSchema correctly', () => {
    expect(
      commonMistakeSchema.safeParse({
        wrongUsage: 'I am agree',
        correctUsage: 'I agree',
        explanation: 'Agree is a verb, not an adjective.',
      }).success
    ).toBe(true)
    expect(commonMistakeSchema.safeParse({ wrongUsage: '', correctUsage: '' }).success).toBe(false)
  })

  it('validates exampleSchema correctly', () => {
    expect(exampleSchema.safeParse({ sentence: 'This is a test sentence.' }).success).toBe(true)
    expect(exampleSchema.safeParse({ sentence: '' }).success).toBe(false)
  })
})
