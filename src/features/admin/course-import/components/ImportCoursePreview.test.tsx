import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ImportCoursePreview } from './ImportCoursePreview'
import type { ImportOutline } from '../types'

const pkg = (sheet: string, row: number, kind: string, code: string, refs: string[]) => ({ cells: { packageCode: code, title: code }, sheet, row, kind, code, title: code, afterTopicSequence: '', questionRefs: refs })

const outline: ImportOutline = {
  course: { cells: { code: 'C1', name: 'Khóa thử', bandLevel: '4.5' }, row: 3, code: 'C1', name: 'Khóa thử', bandLevel: '4.5' },
  topics: [{
    cells: { code: 'T1', name: 'Chủ đề một', skill: 'READING', sortOrder: '1' }, row: 3, code: 'T1', name: 'Chủ đề một', skill: 'READING', sortOrder: '1',
    lessons: [{
      cells: { code: 'L1', topicCode: 'T1', title: 'Bài một' }, row: 3, code: 'L1', title: 'Bài một', knowledgePointCodes: ['K1'],
      blocks: [{ cells: { lessonCode: 'L1', type: 'EXERCISE', questionRefs: 'Q1' }, row: 3, type: 'EXERCISE', questionRefs: ['Q1'] }],
      practiceSets: [pkg('PracticeSets', 3, 'PRACTICE_SET', 'PS1', ['Q1'])],
    }],
    tests: [pkg('Tests', 3, 'TOPIC_TEST', 'TT1', ['Q1'])],
  }],
  courseTests: [], milestones: [],
  questions: [{ cells: { importRef: 'Q1', type: 'FILL_IN_BLANK', stem: 'Nội dung câu một', answer: 'x' }, row: 3, importRef: 'Q1', type: 'FILL_IN_BLANK', skill: 'READING' }],
}

describe('ImportCoursePreview', () => {
  it('lays the course out like the course screen and opens topic, lesson and question from the file', () => {
    render(<ImportCoursePreview errors={[{ sheet: 'Questions', row: 3, column: 'answer', code: 'NO_ACCEPTED_ANSWER', message: 'x' }]} outline={outline} warnings={[]} />)
    expect(screen.getByText('Khóa thử')).toBeInTheDocument()
    expect(screen.getByText('Chủ đề một')).toBeInTheDocument()
    expect(screen.getByText('1 lỗi')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Mở bài học/ }))
    fireEvent.click(screen.getByRole('button', { name: /Sửa bài học/ }))
    expect(screen.getAllByDisplayValue('Nội dung câu một').length).toBeGreaterThan(0)
    expect(screen.getAllByRole('alert')[0]).toHaveTextContent('Chưa có đáp án chấp nhận.')
  })
})
