import { fireEvent, render, screen, within } from '@/test/render'
import { describe, expect, it, vi } from 'vitest'
import type { TreeEdge, TreeNode } from '../../knowledge-graph/types'
import { CourseKnowledgeChartDialog } from './CourseKnowledgeChartDialog'

const node = (id: string, code: string, cefrLevel: string): TreeNode => ({ id, code, name: `Name of ${code}`, skill: 'READING', kind: 'SKILL', status: 'ACTIVE', cefrLevel }) as TreeNode
/** Two goals that both need the basics, and the basics need the foundation: the basics are drawn once, under the first goal. */
const nodes = [node('goal', 'KP_GOAL', 'C1'), node('other', 'KP_OTHER', 'C1'), node('basics', 'KP_BASICS', 'B2'), node('foundation', 'KP_FOUNDATION', 'B1')]
const edges: TreeEdge[] = [{ from: 'foundation', to: 'basics' }, { from: 'basics', to: 'goal' }, { from: 'basics', to: 'other' }]

function show(picked: string[] = [], limit = 40, onChange = vi.fn()) {
  render(<CourseKnowledgeChartDialog description="Chọn" edges={edges} limit={limit} nodes={nodes} onChange={onChange} onClose={vi.fn()} picked={picked} root={{ title: 'Khóa học band 6.5', note: 'Đọc' }} />)
  return { onChange, dialog: screen.getByRole('dialog', { name: 'Sơ đồ điểm kiến thức' }) }
}

describe('CourseKnowledgeChartDialog', () => {
  it('draws every point once as a box with a checkbox, and the course band in one large box', () => {
    const { dialog } = show()

    expect(within(dialog).getAllByRole('checkbox')).toHaveLength(4)
    expect(within(dialog).getAllByRole('checkbox', { name: /^KP_BASICS/ })).toHaveLength(1)
    expect(within(dialog).getAllByText('Khóa học band 6.5')).toHaveLength(1)
    expect(within(dialog).getByText('Đọc')).toBeInTheDocument()
  })

  it('joins the boxes with lines: one for each point beneath another, and one for a point that serves a second goal too', () => {
    const { dialog } = show()

    // Large box to each goal (2), goal to basics, basics to foundation; then basics to the other goal.
    const lines = Array.from(dialog.querySelectorAll('.react-flow__edge')).map((line) => line.getAttribute('data-id'))
    expect(lines).toHaveLength(5)
    expect(lines.filter((id) => id?.startsWith('link-'))).toEqual(['link-basics>other'])
    expect(within(dialog).getByText(/Cũng là tiên quyết của KP_OTHER/)).toBeInTheDocument()
  })

  it('ticks and unticks a point from its box', () => {
    const picked = show(['basics'])
    fireEvent.click(within(picked.dialog).getByRole('checkbox', { name: /^KP_GOAL/ }))
    expect(picked.onChange).toHaveBeenCalledWith(['basics', 'goal'])
    fireEvent.click(within(picked.dialog).getByRole('checkbox', { name: /^KP_BASICS/ }))
    expect(picked.onChange).toHaveBeenLastCalledWith([])
  })

  it('stops offering unticked points once the limit is reached', () => {
    const { dialog } = show(['basics'], 1)

    expect(within(dialog).getByRole('checkbox', { name: /^KP_GOAL/ })).toBeDisabled()
    expect(within(dialog).getByRole('checkbox', { name: /^KP_BASICS/ })).toBeEnabled()
  })

  it('zooms and fits with the buttons React Flow brings, labelled in Vietnamese', () => {
    const { dialog } = show()
    const controls = within(within(dialog).getByLabelText('Điều khiển sơ đồ'))

    expect(controls.getByRole('button', { name: 'Phóng to' })).toBeInTheDocument()
    expect(controls.getByRole('button', { name: 'Thu nhỏ' })).toBeInTheDocument()
    expect(controls.getByRole('button', { name: 'Vừa khung' })).toBeInTheDocument()
  })
})
