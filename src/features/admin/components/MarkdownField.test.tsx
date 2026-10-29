import { useState } from 'react'
import { fireEvent, render, screen, within } from '@/test/render'
import { describe, expect, it } from 'vitest'
import { MarkdownField } from './MarkdownField'

const SUMMARY = '## Learning Outcomes\n\nSau bài học, bạn có thể:\n\n1. Tìm câu chủ đề.\n\n## Key Points\n\n- **Vị trí:** câu đầu đoạn.'

function Harness({ start = SUMMARY, preview }: { start?: string; preview?: (markdown: string) => string }) {
  const [value, setValue] = useState(start)
  return <MarkdownField label="Tóm tắt (Markdown)" onChange={setValue} preview={preview ? (markdown) => <p>{preview(markdown)}</p> : undefined} value={value} />
}

describe('MarkdownField', () => {
  it('edits the text through a labelled text area', () => {
    render(<Harness start="" />)

    fireEvent.change(screen.getByLabelText('Tóm tắt (Markdown)'), { target: { value: '## Key Points' } })

    expect((screen.getByLabelText('Tóm tắt (Markdown)') as HTMLTextAreaElement).value).toBe('## Key Points')
  })

  it('opens a dialog that shows the text as the learner reads it, one card per heading, and leaves the text alone', () => {
    render(<Harness />)
    expect(screen.queryByRole('dialog')).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))

    const dialog = screen.getByRole('dialog', { name: 'Xem trước tóm tắt' })
    expect(dialog.textContent).toContain('Learning Outcomes')
    expect(dialog.textContent).toContain('Section A')
    expect(dialog.textContent).toContain('Section B')
    expect(dialog.textContent).toContain('Tìm câu chủ đề.')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Đóng' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect((screen.getByLabelText('Tóm tắt (Markdown)') as HTMLTextAreaElement).value).toBe(SUMMARY)
  })

  it('shows the text written so far each time it is opened', () => {
    render(<Harness start="## One" />)
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Đóng' }))

    fireEvent.change(screen.getByLabelText('Tóm tắt (Markdown)'), { target: { value: '## Two' } })
    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))

    expect(screen.getByRole('dialog').textContent).toContain('Two')
  })

  it('says there is no summary when the text is empty', () => {
    render(<Harness start="" />)

    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))

    expect(within(screen.getByRole('dialog')).getByText('Bài học này chưa có phần tóm tắt.')).toBeTruthy()
  })

  it('shows what the owner gives for the preview instead of the plain summary', () => {
    render(<Harness preview={(markdown) => `custom:${markdown.length}`} />)

    fireEvent.click(screen.getByRole('button', { name: 'Xem trước' }))

    expect(within(screen.getByRole('dialog')).getByText(`custom:${SUMMARY.length}`)).toBeTruthy()
  })
})
