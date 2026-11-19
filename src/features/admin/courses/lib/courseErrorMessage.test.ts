import { describe, expect, it } from 'vitest'
import { HttpError } from '@/lib/httpClient'
import { courseErrorMessage } from './courseErrorMessage'

describe('courseErrorMessage', () => {
  it('says in Vietnamese which of the code or the band is already taken', () => {
    expect(courseErrorMessage(new HttpError(409, "Course with code 'IELTS_6_0' already exists")))
      .toBe('Mã khóa học "IELTS_6_0" đã được dùng. Hãy chọn mã khác.')
    expect(courseErrorMessage(new HttpError(409, "Course with bandLevel '6.0' already exists")))
      .toBe('Band 6.0 đã có khóa học. Mỗi band chỉ có một khóa học.')
    expect(courseErrorMessage(new HttpError(409, "Course with bandLevel '6.50' already exists"))).toContain('Band 6.5 ')
  })

  it('says why a course that still holds content cannot be deleted and what to do instead', () => {
    const message = courseErrorMessage(new HttpError(409, 'Course 1 still has topics', null, 'COURSE_NOT_EMPTY'))
    expect(message).toContain('không xóa được')
    expect(message).toContain('Ngừng dùng')
  })

  it('keeps the message of any other error', () => {
    expect(courseErrorMessage(new HttpError(500, 'Máy chủ lỗi'))).toBe('Máy chủ lỗi')
    expect(courseErrorMessage(new HttpError(400, "Course with code 'X' already exists"))).toBe("Course with code 'X' already exists")
  })
})
