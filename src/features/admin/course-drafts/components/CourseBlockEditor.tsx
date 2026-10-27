import { COURSE_QUESTION_LIMIT } from '../types'
import type { CourseBlock } from '../types'
import { CourseQuestionList } from './CourseQuestionList'

/** The body of one block; its title and move/remove buttons belong to the lesson editor's card around it. */
export function CourseBlockEditor({ value, onChange, disabled, number }: {
  value: CourseBlock; onChange: (next: CourseBlock) => void; disabled: boolean; number: number
}) {
  return <div className="adm-course-draft-block">
    {value.type === 'TEXT' ? <>
      <label className="adm-field"><span>Nội dung khối {number}</span><textarea className="adm-textarea" maxLength={20000} value={value.text ?? ''} onChange={(event) => onChange({ ...value, text: event.target.value })} /></label>
    </> : <>
      <CourseQuestionList disabled={disabled} limit={COURSE_QUESTION_LIMIT} onChange={(questionRefs) => onChange({ ...value, questionRefs })} value={value.questionRefs} />
    </>}
  </div>
}
