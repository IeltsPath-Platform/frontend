import { fireEvent, render, screen } from '@/test/render'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import type { TreeNode } from '../../knowledge-graph/types'
import { CourseKnowledgeDialog } from './CourseKnowledgeDialog'

const node = (id: string, cefrLevel: TreeNode['cefrLevel'] = 'B2'): TreeNode => ({ id, code: `KP_${id}`, name: `Point ${id}`, kind: 'STRATEGY', status: 'ACTIVE', skill: 'READING', cefrLevel, canDo: `Can do ${id}` })
const offered = [node('1'), node('2'), node('3'), node('4', 'B1'), node('5', 'B1')]

function Harness({ limit }: { limit: number }) {
  const [picked, setPicked] = useState<string[]>([])
  return <CourseKnowledgeDialog description="band 6.0" limit={limit} offered={offered} onChange={setPicked} onClose={() => undefined} picked={picked} />
}

describe('CourseKnowledgeDialog', () => {
  it('shows what each point lets a learner do', () => {
    render(<Harness limit={5} />)
    expect(screen.getByText('Can do 2')).toBeInTheDocument()
  })

  it('lists a point without a level in its own group, after the levels, so it can still be chosen', () => {
    const mixed = [node('1', 'B1'), node('9', null)]
    function Mixed() {
      const [picked, setPicked] = useState<string[]>([])
      return <CourseKnowledgeDialog description="tất cả" limit={5} offered={mixed} onChange={setPicked} onClose={() => undefined} picked={picked} />
    }
    render(<Mixed />)
    const groups = screen.getAllByRole('region').map((group) => group.getAttribute('aria-label'))
    expect(groups).toEqual(['Cấp B1', 'Chưa xếp cấp'])
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả chưa xếp cấp' }))
    expect(screen.getByRole('checkbox', { name: /KP_9/ })).toBeChecked()
    expect(screen.getByRole('button', { name: 'Thu gọn chưa xếp cấp' })).toBeInTheDocument()
  })

  it('stops offering more points once the limit is reached, and frees them when one is unpicked', () => {
    render(<Harness limit={2} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /KP_1/ }))
    fireEvent.click(screen.getByRole('checkbox', { name: /KP_2/ }))
    expect(screen.getByRole('checkbox', { name: /KP_3/ })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'Chọn tất cả cấp B1' })).toBeDisabled()
    expect(screen.getByText(/2\/2 đã chọn · đã đạt tối đa/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: /KP_1/ }))
    expect(screen.getByRole('checkbox', { name: /KP_3/ })).toBeEnabled()
  })

  it('ticks and unticks every point of one level with its own checkbox, and shows a partial level as mixed', () => {
    render(<Harness limit={10} />)
    const b2 = screen.getByRole('checkbox', { name: 'Chọn tất cả cấp B2' }) as HTMLInputElement
    fireEvent.click(screen.getByRole('checkbox', { name: /KP_1/ }))
    expect(b2.indeterminate).toBe(true)
    expect(screen.getByText('1/3 điểm đã chọn')).toBeInTheDocument()
    fireEvent.click(b2)
    expect(b2).toBeChecked()
    expect(b2.indeterminate).toBe(false)
    expect(screen.getByText(/3\/10 đã chọn/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /KP_4/ })).not.toBeChecked()
    fireEvent.click(b2)
    expect(screen.getByText(/0\/10 đã chọn/)).toBeInTheDocument()
  })

  it('folds and unfolds the points of one level without touching the picks or the other levels', () => {
    render(<Harness limit={10} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /KP_1/ }))
    const fold = screen.getByRole('button', { name: 'Thu gọn cấp B2' })
    expect(fold).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(fold)
    const unfold = screen.getByRole('button', { name: 'Mở cấp B2' })
    expect(unfold).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById(unfold.getAttribute('aria-controls')!)).toHaveAttribute('inert')
    expect(document.getElementById('kp-level-B1')).not.toHaveAttribute('inert')
    expect(screen.getByText('1/3 điểm đã chọn')).toBeInTheDocument()
    fireEvent.click(unfold)
    expect(screen.getByRole('button', { name: 'Thu gọn cấp B2' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('checkbox', { name: /KP_1/ })).toBeChecked()
  })

  it('selects only what the limit leaves room for when a level is ticked, and only the points on the list', () => {
    render(<Harness limit={4} />)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả cấp B2' }))
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả cấp B1' }))
    expect(screen.getByText(/4\/4 đã chọn · đã đạt tối đa/)).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: /KP_5/ })).not.toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ chọn tất cả' }))
    fireEvent.change(screen.getByLabelText('Lọc điểm kiến thức'), { target: { value: 'Point 4' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Chọn tất cả cấp B1' }))
    fireEvent.change(screen.getByLabelText('Lọc điểm kiến thức'), { target: { value: '' } })
    expect(screen.getByRole('checkbox', { name: /KP_4/ })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: /KP_5/ })).not.toBeChecked()
  })
})

describe('CourseKnowledgeDialog for a skill', () => {
  const skilled = (id: string, skill: string | null) => ({ ...node(id), skill })
  const mixed = [skilled('1', 'LISTENING'), skilled('2', 'READING'), skilled('3', 'ALL'), skilled('4', null), skilled('5', 'WRITING')]
  function ForSkill({ initial = [] }: { initial?: string[] }) {
    const [picked, setPicked] = useState<string[]>(initial)
    return <CourseKnowledgeDialog description="bài học" limit={5} offered={mixed} onChange={setPicked} onClose={() => undefined} picked={picked} skill="LISTENING" />
  }

  it('opens on the points of the lesson skill, the shared ones and the ones without a skill', () => {
    render(<ForSkill />)
    expect(screen.getByText('Point 1')).toBeInTheDocument()
    expect(screen.getByText('Point 3')).toBeInTheDocument()
    expect(screen.getByText('Point 4')).toBeInTheDocument()
    expect(screen.queryByText('Point 2')).not.toBeInTheDocument()
    expect(screen.queryByText('Point 5')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Tất cả/ })).toHaveTextContent('3')
  })

  it('shows every point when the switch is turned off, and goes back when it is turned on', () => {
    render(<ForSkill />)
    const only = screen.getByRole('switch', { name: 'Chỉ kỹ năng Nghe và Chung' })
    fireEvent.click(only)
    expect(screen.getByText('Point 2')).toBeInTheDocument()
    expect(screen.getByText('Point 5')).toBeInTheDocument()
    fireEvent.click(only)
    expect(screen.queryByText('Point 2')).not.toBeInTheDocument()
  })

  it('keeps a point that is already picked on the list even when it is of another skill', () => {
    render(<ForSkill initial={['5']} />)
    expect(screen.getByText('Point 5')).toBeInTheDocument()
    expect(screen.queryByText('Point 2')).not.toBeInTheDocument()
  })

  it('has no switch when no skill is given', () => {
    render(<Harness limit={5} />)
    expect(screen.queryByRole('switch')).not.toBeInTheDocument()
  })

  it('finds a point by what its can-do says, and closes with Xong', () => {
    render(<ForSkill />)
    fireEvent.change(screen.getByLabelText('Lọc điểm kiến thức'), { target: { value: 'can do 3' } })
    expect(screen.getByText('Point 3')).toBeInTheDocument()
    expect(screen.queryByText('Point 1')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Xong' })).toBeInTheDocument()
  })
})