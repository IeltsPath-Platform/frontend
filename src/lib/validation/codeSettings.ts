import { z } from 'zod'
import { nonNegativeIntegerText } from './fields'

type Kind = 'COURSE' | 'TOPIC' | 'LESSON' | 'PACKAGE'

/** The keywords each kind of code accepts, as the server lists them, with the wording of the refusal. */
const KEYWORDS: Record<Kind, { allowed: RegExp; refusal: string; keeps: string }> = {
  COURSE: { allowed: /^(SEQ(?::\d{1,2})?|BAND|YYYY)$/, refusal: 'Chỉ dùng {SEQ}, {SEQ:n}, {BAND} và {YYYY} cho mã khóa học.', keeps: 'Cấu trúc cần có {SEQ} hoặc {BAND} để tránh trùng mã.' },
  TOPIC: { allowed: /^(SEQ(?::\d{1,2})?|COURSE|SKILL)$/, refusal: 'Chỉ dùng {SEQ}, {SEQ:n}, {COURSE} và {SKILL} cho mã chủ đề.', keeps: 'Cấu trúc mã chủ đề cần có {SEQ} để tránh trùng mã.' },
  LESSON: { allowed: /^(SEQ(?::\d{1,2})?|TOPIC)$/, refusal: 'Chỉ dùng {SEQ}, {SEQ:n} và {TOPIC} cho mã bài học.', keeps: 'Cấu trúc mã bài học cần có {SEQ} để tránh trùng mã.' },
  PACKAGE: { allowed: /^(SEQ(?::\d{1,2})?|COURSE|TYPE)$/, refusal: 'Chỉ dùng {SEQ}, {SEQ:n}, {COURSE} và {TYPE} cho mã gói đề.', keeps: 'Cấu trúc mã gói đề cần có {SEQ} để tránh trùng mã.' },
}

function codePattern(kind: Kind) {
  const rule = KEYWORDS[kind]
  return z.string().trim().min(1, 'Cấu trúc bộ mã không được để trống.').max(255, 'Cấu trúc bộ mã tối đa 255 ký tự.')
    .superRefine((pattern, context) => {
      const tokens = [...pattern.matchAll(/\{([^{}]*)\}/g)].map((match) => match[1]!)
      const remainder = pattern.replace(/\{([^{}]*)\}/g, '')
      if (/[{}]/.test(remainder)) context.addIssue({ code: 'custom', message: 'Cấu trúc bộ mã có từ khóa không hợp lệ.' })
      if (tokens.some((token) => !rule.allowed.test(token))) context.addIssue({ code: 'custom', message: rule.refusal })
      const widths = tokens.filter((token) => token.startsWith('SEQ:')).map((token) => Number(token.slice(4)))
      if (widths.some((width) => width < 1 || width > 12)) context.addIssue({ code: 'custom', message: 'Độ rộng {SEQ:n} phải từ 1 đến 12.' })
      if (!tokens.some((token) => token === 'SEQ' || token.startsWith('SEQ:') || (kind === 'COURSE' && token === 'BAND'))) {
        context.addIssue({ code: 'custom', message: rule.keeps })
      }
    })
}

export function codeSettingsSchema(kind: Kind) {
  return z.object({ pattern: codePattern(kind), startNumber: nonNegativeIntegerText('Số bắt đầu khởi tạo') })
}