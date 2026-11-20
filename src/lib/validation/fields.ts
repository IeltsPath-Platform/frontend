import { z } from 'zod'

/**
 * Building blocks for the schema of a form whose values are the strings its inputs hold. Each takes the label of its
 * field, so the message names the field it is about and the form needs no wording of its own. A field is required
 * exactly when its schema rejects an empty string, which is what `isRequiredField` reads to draw the red star.
 */

/** A text that must be filled in, trimmed, at most `max` characters. */
export function requiredText(label: string, max: number) {
  return z.string({ error: `${label} không được để trống.` })
    .trim()
    .min(1, `${label} không được để trống.`)
    .max(max, `${label} tối đa ${max} ký tự.`)
}

/** A text that may stay empty, trimmed, at most `max` characters. */
export function optionalText(label: string, max: number) {
  return z.string().trim().max(max, `${label} tối đa ${max} ký tự.`)
}

function isBand(value: string) {
  const number = Number(value)
  return value.trim() !== '' && Number.isFinite(number) && number >= 0 && number <= 9 && Number.isInteger(number * 2)
}

/** An email address, trimmed. Empty is refused with its own message, then the format is checked. */
export function emailText(label = 'Email') {
  return z.string({ error: `${label} không được để trống.` })
    .trim()
    .min(1, `${label} không được để trống.`)
    .pipe(z.email({ error: `${label} không hợp lệ.` }))
}

/** A choice that must be made from a list: empty is refused with Chọn <label>.. */
export function requiredChoice(label: string) {
  return z.string({ error: `Chọn ${label}.` }).min(1, `Chọn ${label}.`)
}

/** An IELTS band written in the input: 0 to 9 in steps of 0.5. Empty is refused unless `optional`. */
export function bandText(label: string, options: { optional?: boolean } = {}) {
  return z.string({ error: `${label} không được để trống.` }).superRefine((value, ctx) => {
    if (value.trim() === '') {
      if (!options.optional) ctx.addIssue({ code: 'custom', message: `${label} không được để trống.` })
      return
    }
    if (!isBand(value)) ctx.addIssue({ code: 'custom', message: `${label} phải từ 0 đến 9, bước 0,5.` })
  })
}

/** A whole number above zero written in the input. Empty is refused unless `optional`. */
export function positiveIntegerText(label: string, options: { optional?: boolean } = {}) {
  return z.string({ error: `${label} không được để trống.` }).superRefine((value, ctx) => {
    const text = value.trim()
    if (text === '') {
      if (!options.optional) ctx.addIssue({ code: 'custom', message: `${label} không được để trống.` })
      return
    }
    if (!/^\d+$/.test(text) || Number(text) <= 0) ctx.addIssue({ code: 'custom', message: `${label} phải là số nguyên dương.` })
  })
}

/** A whole number from zero up written in the input. Empty is refused unless `optional`. */
export function nonNegativeIntegerText(label: string, options: { optional?: boolean } = {}) {
  return z.string({ error: `${label} không được để trống.` }).superRefine((value, ctx) => {
    const text = value.trim()
    if (text === '') {
      if (!options.optional) ctx.addIssue({ code: 'custom', message: `${label} không được để trống.` })
      return
    }
    if (!/^\d+$/.test(text)) ctx.addIssue({ code: 'custom', message: `${label} phải là số nguyên không âm.` })
  })
}

/** Whether the field needs a value: its schema refuses an empty string. */
export function isRequiredField(schema: z.ZodObject<z.ZodRawShape>, name: string): boolean {
  const field = schema.shape[name] as z.ZodType | undefined
  return field !== undefined && !field.safeParse('').success
}
