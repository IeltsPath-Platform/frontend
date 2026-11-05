import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOCUMENT_LINK_MAX_AGE_MS, LessonDocuments } from './LessonDocuments'

const documents = [{ id: 'd1', title: 'Giáo trình Part 1', url: 'https://storage.example/signed?token=t', sortOrder: 0 }]

describe('LessonDocuments', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('says so when the lesson has no documents', () => {
    render(<LessonDocuments documents={[]} />)
    expect(screen.getByText('Bài học này chưa có tài liệu.')).toBeInTheDocument()
  })

  it('opens a fresh link in another tab without reloading the list', () => {
    const onRefresh = vi.fn()
    render(<LessonDocuments documents={documents} onRefresh={onRefresh} />)
    const link = screen.getByRole('link', { name: /Giáo trình Part 1/ })
    expect(link).toHaveAttribute('href', documents[0]!.url)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')

    expect(fireEvent.click(link)).toBe(true)
    expect(onRefresh).not.toHaveBeenCalled()
  })

  it('reloads the list instead of opening a link that has been on the page past its signing window', () => {
    const onRefresh = vi.fn()
    render(<LessonDocuments documents={documents} onRefresh={onRefresh} />)
    vi.setSystemTime(Date.now() + DOCUMENT_LINK_MAX_AGE_MS + 1000)

    // fireEvent returns false when the click was cancelled, so the stale link did not open.
    expect(fireEvent.click(screen.getByRole('link', { name: /Giáo trình Part 1/ }))).toBe(false)
    expect(onRefresh).toHaveBeenCalledTimes(1)
  })

  it('leaves the link alone when no refresh is available', () => {
    render(<LessonDocuments documents={documents} />)
    vi.setSystemTime(Date.now() + DOCUMENT_LINK_MAX_AGE_MS + 1000)
    expect(fireEvent.click(screen.getByRole('link', { name: /Giáo trình Part 1/ }))).toBe(true)
  })
})
