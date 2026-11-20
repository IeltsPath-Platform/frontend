import { z } from 'zod'
import { nonNegativeIntegerText } from './fields'

function codePattern(kind: 'COURSE' | 'TOPIC') {
  return z.string().trim().min(1, 'Cấu trúc bộ mã không được để trống.').max(255, 'Cấu trúc bộ mã tối đa 255 ký tự.')
    .superRefine((pattern, context) => {
      const tokens = [...pattern.matchAll(/\{([^{}]*)\}/g)].map((match) => match[1]!)
      const remainder = pattern.replace(/\{([^{}]*)\}/g, '')
      if (/[{}]/.test(remainder)) context.addIssue({ code: 'custom', message: 'Cấu trúc bộ mã có từ khóa không hợp lệ.' })
      const allowed = kind === 'COURSE' ? /^(SEQ(?::\d{1,2})?|BAND|YYYY)$/ : /^(SEQ(?::\d{1,2})?|COURSE|SKILL)$/
      if (tokens.some((token) => !allowed.test(token))) {
        context.addIssue({ code: 'custom', message: kind === 'COURSE'
          ? 'Chỉ dùng {SEQ}, {SEQ:n}, {BAND} và {YYYY} cho mã khóa học.'
          : 'Chỉ dùng {SEQ}, {SEQ:n}, {COURSE} và {SKILL} cho mã chủ đề.' })
      }
      const widths = tokens.filter((token) => token.startsWith('SEQ:')).map((token) => Number(token.slice(4)))
      if (widths.some((width) => width < 1 || width > 12)) context.addIssue({ code: 'custom', message: 'Độ rộng {SEQ:n} phải từ 1 đến 12.' })
      if (!tokens.some((token) => token === 'SEQ' || token.startsWith('SEQ:') || (kind === 'COURSE' && token === 'BAND'))) {
        context.addIssue({ code: 'custom', message: kind === 'COURSE'
          ? 'Cấu trúc cần có {SEQ} hoặc {BAND} để tránh trùng mã.'
          : 'Cấu trúc mã chủ đề cần có {SEQ} để tránh trùng mã.' })
      }
    })
}

export function codeSettingsSchema(kind: 'COURSE' | 'TOPIC') {
  return z.object({ pattern: codePattern(kind), startNumber: nonNegativeIntegerText('Số bắt đầu khởi tạo') })
}
