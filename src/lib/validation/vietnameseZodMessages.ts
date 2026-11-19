import { z } from 'zod'

/**
 * The default message of every zod check, in Vietnamese. A schema that names its field in its own messages
 * ("Mã khóa học không được để trống.") keeps them; these cover the checks that did not set one, so no English sentence
 * from the library can reach a form.
 */
export function vietnameseIssueMessage(issue: z.core.$ZodRawIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      return issue.input === undefined || issue.input === null ? 'Không được để trống.' : 'Giá trị không hợp lệ.'
    case 'too_small':
      if (issue.origin === 'string') return Number(issue.minimum) <= 1 ? 'Không được để trống.' : `Cần ít nhất ${String(issue.minimum)} ký tự.`
      if (issue.origin === 'array' || issue.origin === 'set') return Number(issue.minimum) <= 1 ? 'Cần chọn ít nhất một mục.' : `Cần chọn ít nhất ${String(issue.minimum)} mục.`
      return `Giá trị không được nhỏ hơn ${String(issue.minimum)}.`
    case 'too_big':
      if (issue.origin === 'string') return `Tối đa ${String(issue.maximum)} ký tự.`
      if (issue.origin === 'array' || issue.origin === 'set') return `Chọn tối đa ${String(issue.maximum)} mục.`
      return `Giá trị không được lớn hơn ${String(issue.maximum)}.`
    case 'invalid_format':
      return issue.format === 'email' ? 'Địa chỉ email không đúng định dạng.' : 'Định dạng không hợp lệ.'
    case 'not_multiple_of':
      return `Giá trị phải là bội số của ${String(issue.divisor)}.`
    default:
      return 'Giá trị không hợp lệ.'
  }
}

/** Makes the Vietnamese messages the default for every schema; called once when the app starts. */
export function installVietnameseZodMessages(): void {
  z.config({ customError: vietnameseIssueMessage })
}
