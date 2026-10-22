import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { EssaySampleText } from './EssaySampleText'

const TASK_1_SAMPLE = [
  'The chart compares **car ownership rate** in four countries.',
  'Overall, ownership rose in three countries.',
  'Country D led in 2000 and A **recorded a rise** to 72% by 2020.',
  '**By comparison**, B and C began lower.',
].join('\n\n')

const TASK_2_SAMPLE = [
  'Some people disagree. I favour **a flexible arrangement**.',
  'Supporters value flexibility.',
  'Others prefer an office.',
  'In conclusion, a mixed approach is better.',
].join('\n\n')

describe('EssaySampleText', () => {
  it('labels the four paragraphs of a Task 1 sample with its parts', () => {
    render(<EssaySampleText sample={TASK_1_SAMPLE} task="TASK_1" />)
    expect(screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent))
      .toEqual(['Introduction', 'Overview', 'Body 1', 'Body 2'])
  })

  it('labels the four paragraphs of a Task 2 sample with its parts', () => {
    render(<EssaySampleText sample={TASK_2_SAMPLE} task="TASK_2" />)
    expect(screen.getAllByRole('heading', { level: 4 }).map((heading) => heading.textContent))
      .toEqual(['Introduction', 'Body 1', 'Body 2', 'Conclusion'])
  })

  it('highlights marked phrases without showing the asterisks', () => {
    const { container } = render(<EssaySampleText sample={TASK_1_SAMPLE} task="TASK_1" />)
    expect([...container.querySelectorAll('mark')].map((mark) => mark.textContent))
      .toEqual(['car ownership rate', 'recorded a rise', 'By comparison'])
    expect(container.textContent).not.toContain('*')
    expect(screen.getByText('Các cụm được tô nổi là từ vựng nên học.')).toBeInTheDocument()
  })

  it('shows a plain sample without labels or legend', () => {
    const { container } = render(<EssaySampleText sample="One paragraph only." task="TASK_1" />)
    expect(screen.queryAllByRole('heading')).toHaveLength(0)
    expect(container.querySelectorAll('mark')).toHaveLength(0)
    expect(screen.queryByText(/được tô nổi/)).not.toBeInTheDocument()
    expect(screen.getByText('One paragraph only.')).toBeInTheDocument()
  })

  it('shows no labels when the task is unknown', () => {
    render(<EssaySampleText sample={TASK_2_SAMPLE} task={null} />)
    expect(screen.queryAllByRole('heading')).toHaveLength(0)
  })

  it('does not label a sample whose paragraphs do not match the parts', () => {
    render(<EssaySampleText sample={'First.\n\nSecond.\n\nThird.'} task="TASK_1" />)
    expect(screen.queryAllByRole('heading')).toHaveLength(0)
    expect(screen.getByText('Third.')).toBeInTheDocument()
  })
})
