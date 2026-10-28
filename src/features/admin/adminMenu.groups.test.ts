import { describe, expect, it } from 'vitest'
import { menuEntriesFor, menuFor } from './adminMenu'

function summary(roles: string[]) {
  return menuEntriesFor(roles).map((entry) =>
    entry.kind === 'group' ? { group: entry.label, items: entry.items.map((item) => item.label) } : entry.item.label)
}

describe('menuEntriesFor', () => {
  it('folds the content author screens under a few icons, in the order the screens first appear', () => {
    expect(summary(['CONTENT_AUTHOR'])).toEqual([
      'Tổng quan nội dung',
      { group: 'Chương trình học', items: ['Khóa học & chủ đề', 'Cây tri thức', 'Dựng khóa học'] },
      { group: 'Câu hỏi & đề', items: ['Ngân hàng câu hỏi', 'Đề & gói câu hỏi', 'Nhập Excel', 'Sinh nội dung bằng AI'] },
      'Việc cần làm',
      { group: 'Chất lượng chấm', items: ['Đánh giá giám khảo', 'Đánh giá AI chấm Writing', 'Rubric chấm Writing', 'Mã lỗi'] },
    ])
  })

  it('offers exactly the same screens as the flat menu, so nothing is lost by grouping', () => {
    const grouped = menuEntriesFor(['CONTENT_AUTHOR']).flatMap((entry) => entry.kind === 'group' ? entry.items : [entry.item])
    expect(grouped.map((item) => item.path).sort()).toEqual(menuFor(['CONTENT_AUTHOR']).map((item) => item.path).sort())
  })

  it('shows an administrator the four system screens as plain links', () => {
    expect(summary(['ADMIN'])).toEqual(['Tổng quan hệ thống', 'Người dùng', 'Dịch vụ', 'Hoạt động'])
  })

  it('shows an examiner every screen as a plain link, Writing and Speaking grading included, with nothing hidden in a flyout', () => {
    expect(summary(['EXAMINER'])).toEqual([
      'Tổng quan chấm bài',
      'Chấm Writing',
      'Chấm Speaking',
      'Cây tri thức',
    ])
    expect(menuEntriesFor(['EXAMINER']).every((entry) => entry.kind === 'link')).toBe(true)
    const graph = menuEntriesFor(['EXAMINER'])[3]
    expect(graph.kind === 'link' && graph.item.path).toBe('/admin/knowledge-graph')
  })

  it('shows learners nothing', () => {
    expect(menuEntriesFor(['CUSTOMER'])).toEqual([])
    expect(menuEntriesFor(undefined)).toEqual([])
  })
})
