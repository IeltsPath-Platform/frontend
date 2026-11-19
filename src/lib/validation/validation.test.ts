import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { bandText, isRequiredField, nonNegativeIntegerText, optionalText, positiveIntegerText, requiredText } from './fields'
import { vietnameseIssueMessage } from './vietnameseZodMessages'

const messageOf = (schema: z.ZodType, value: unknown) => {
  const result = schema.safeParse(value)
  return result.success ? null : result.error.issues[0]!.message
}

describe('requiredText', () => {
  const schema = requiredText('Mã khóa học', 5)
  it('names the field when it is empty or only spaces', () => {
    expect(messageOf(schema, '')).toBe('Mã khóa học không được để trống.')
    expect(messageOf(schema, '   ')).toBe('Mã khóa học không được để trống.')
    expect(messageOf(schema, undefined)).toBe('Mã khóa học không được để trống.')
  })
  it('refuses a text that is too long and accepts one that fits, trimmed', () => {
    expect(messageOf(schema, 'abcdef')).toBe('Mã khóa học tối đa 5 ký tự.')
    expect(schema.parse('  abc ')).toBe('abc')
  })
})

describe('optionalText', () => {
  it('accepts an empty text and refuses one that is too long', () => {
    const schema = optionalText('Mô tả', 3)
    expect(schema.safeParse('').success).toBe(true)
    expect(messageOf(schema, 'abcd')).toBe('Mô tả tối đa 3 ký tự.')
  })
})

describe('bandText', () => {
  const schema = bandText('Band khóa học')
  it('accepts 0 to 9 in half steps', () => {
    for (const value of ['0', '5.5', '9', '6.0']) expect(schema.safeParse(value).success).toBe(true)
  })
  it('says what is wrong: empty, or not a half step in range', () => {
    expect(messageOf(schema, '')).toBe('Band khóa học không được để trống.')
    expect(messageOf(schema, '5.3')).toBe('Band khóa học phải từ 0 đến 9, bước 0,5.')
    expect(messageOf(schema, '9.5')).toBe('Band khóa học phải từ 0 đến 9, bước 0,5.')
    expect(messageOf(schema, 'abc')).toBe('Band khóa học phải từ 0 đến 9, bước 0,5.')
  })
  it('lets an optional band stay empty but still checks one that is written', () => {
    const optional = bandText('Band thấp nhất', { optional: true })
    expect(optional.safeParse('').success).toBe(true)
    expect(messageOf(optional, '12')).toBe('Band thấp nhất phải từ 0 đến 9, bước 0,5.')
  })
})

describe('integer texts', () => {
  it('positiveIntegerText refuses zero, decimals and words', () => {
    const schema = positiveIntegerText('Giá mở khóa', { optional: true })
    expect(schema.safeParse('').success).toBe(true)
    expect(schema.safeParse('120').success).toBe(true)
    for (const bad of ['0', '1.5', '-3', 'abc']) expect(messageOf(schema, bad)).toBe('Giá mở khóa phải là số nguyên dương.')
    expect(messageOf(positiveIntegerText('Giá mở khóa'), '')).toBe('Giá mở khóa không được để trống.')
  })
  it('nonNegativeIntegerText accepts zero', () => {
    const schema = nonNegativeIntegerText('Thứ tự')
    expect(schema.safeParse('0').success).toBe(true)
    expect(messageOf(schema, '-1')).toBe('Thứ tự phải là số nguyên không âm.')
  })
})

describe('isRequiredField', () => {
  const schema = z.object({ code: requiredText('Mã', 10), note: optionalText('Ghi chú', 10), band: bandText('Band'), low: bandText('Thấp', { optional: true }) })
  it('is true exactly for the fields that refuse an empty string', () => {
    expect(isRequiredField(schema, 'code')).toBe(true)
    expect(isRequiredField(schema, 'band')).toBe(true)
    expect(isRequiredField(schema, 'note')).toBe(false)
    expect(isRequiredField(schema, 'low')).toBe(false)
    expect(isRequiredField(schema, 'missing')).toBe(false)
  })
})

describe('Vietnamese default messages', () => {
  it('covers the checks a schema left without its own message', () => {
    z.config({ customError: vietnameseIssueMessage })
    const schema = z.object({ name: z.string().min(1), tags: z.array(z.string()).min(1), size: z.number().max(3), mail: z.string().email() })
    const result = schema.safeParse({ name: '', tags: [], size: 9, mail: 'x' })
    expect(result.success).toBe(false)
    const messages = result.success ? [] : result.error.issues.map((issue) => issue.message)
    expect(messages).toEqual(['Không được để trống.', 'Cần chọn ít nhất một mục.', 'Giá trị không được lớn hơn 3.', 'Địa chỉ email không đúng định dạng.'])
    expect(messageOf(z.object({ a: z.string() }), {})).toBe('Không được để trống.')
  })
})
