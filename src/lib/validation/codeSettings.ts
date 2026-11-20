import { z } from 'zod'
import { nonNegativeIntegerText } from './fields'

const courseCodePattern = z.string().trim().min(1, 'Cấu trúc bộ mã không được để trống.').max(255, 'Cấu trúc bộ mã tối đa 255 ký tự.')
  .superRefine((pattern, context) => {
    const tokens = [...pattern.matchAll(/\{([^{}]*)\}/g)].map((match) => match[1]!)
    const remainder = pattern.replace(/\{([^{}]*)\}/g, '')
    if (/[{}]/.test(remainder)) context.addIssue({ code: 'custom', message: 'Cấu trúc bộ mã có từ khóa không hợp lệ.' })
    if (tokens.some((token) => !/^(SEQ(?::\d{1,2})?|BAND|YYYY)$/.test(token))) {
      context.addIssue({ code: 'custom', message: 'Chỉ dùng {SEQ}, {SEQ:n}, {BAND} và {YYYY} cho mã khóa học.' })
    }
    const widths = tokens.filter((token) => token.startsWith('SEQ:')).map((token) => Number(token.slice(4)))
    if (widths.some((width) => width < 1 || width > 12)) context.addIssue({ code: 'custom', message: 'Độ rộng {SEQ:n} phải từ 1 đến 12.' })
    if (!tokens.some((token) => token === 'BAND' || token === 'SEQ' || token.startsWith('SEQ:')))
      context.addIssue({ code: 'custom', message: 'Cấu trúc cần có {SEQ} hoặc {BAND} để tránh trùng mã.' })
  })

export const codeSettingsSchema = z.object({
  pattern: courseCodePattern,
  startNumber: nonNegativeIntegerText('Số bắt đầu khởi tạo'),
})
