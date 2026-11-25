import { fireEvent, render, screen, waitFor, within } from '@/test/render'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LessonSlides } from './LessonSlides'

vi.mock('react-pdf', () => ({
  pdfjs: { GlobalWorkerOptions: { workerSrc: '' } },
  Document: ({ file, children, options, onLoadSuccess, onLoadError }: {
    file: string
    children: ReactNode
    options: { disableRange: boolean; disableStream: boolean }
    onLoadSuccess: (document: { numPages: number }) => void
    onLoadError: () => void
  }) => {
    const [loadCount, setLoadCount] = useState(0)
    const previous = useRef<{ file: string; options: typeof options } | null>(null)
    const loadSuccess = useRef(onLoadSuccess)
    loadSuccess.current = onLoadSuccess
    useEffect(() => {
      if (previous.current?.file === file && Object.is(previous.current.options, options)) return
      previous.current = { file, options }
      setLoadCount((count) => count + 1)
      loadSuccess.current({ numPages: 4 })
    }, [file, options])
    return (
    <div data-disable-range={options.disableRange} data-disable-stream={options.disableStream} data-file={file} data-load-count={loadCount}>
      <button type="button" onClick={() => file.includes('expired') ? onLoadError() : onLoadSuccess({ numPages: 4 })}>Load mock PDF</button>
      {children}
    </div>
    )
  },
  Page: ({ pageNumber, width }: { pageNumber: number; width?: number }) => (
    <div data-testid="pdf-page" data-page={pageNumber} data-width={width} />
  ),
}))

const slides = [
  { id: 's1', title: 'Slide đầu', url: 'https://storage.example/first.pdf?token=one', sortOrder: 0 },
  { id: 's2', title: 'Slide sau', url: 'https://storage.example/expired.pdf?token=two', sortOrder: 1 },
]

describe('LessonSlides', () => {
  beforeEach(() => vi.restoreAllMocks())

  it('shows the empty state when the lesson has no slide', () => {
    render(<LessonSlides slides={[]} onRefresh={vi.fn()} />)
    expect(screen.getByText('Bài học này chưa có slide.')).toBeInTheDocument()
  })

  it('loads one complete PDF, navigates its pages, zooms, and supports keyboard navigation', async () => {
    render(<LessonSlides slides={[slides[0]!]} onRefresh={vi.fn()} />)
    const pdf = await screen.findByText('Load mock PDF')
    const document = pdf.parentElement!
    expect(document).toHaveAttribute('data-disable-range', 'true')
    expect(document).toHaveAttribute('data-disable-stream', 'true')
    fireEvent.click(pdf)
    expect(await screen.findByText('100%')).toBeInTheDocument()
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-page', '1')

    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }))
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-page', '2')
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Trang hiện tại' }), { target: { value: '4' } })
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-page', '4')
    fireEvent.click(screen.getByRole('button', { name: 'Phóng to' }))
    expect(screen.getByText('120%')).toBeInTheDocument()
    expect(document).toHaveAttribute('data-load-count', '1')
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-page', '4')

    const frame = screen.getByRole('group', { name: 'Trình xem Slide đầu' })
    fireEvent.keyDown(frame, { key: 'ArrowLeft' })
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-page', '3')
    fireEvent.keyDown(frame, { key: 'ArrowRight' })
    expect(screen.getByTestId('pdf-page')).toHaveAttribute('data-page', '4')
  })

  it('downloads the signed URL and reloads the lesson resources after a PDF error', async () => {
    const onRefresh = vi.fn()
    render(<LessonSlides slides={slides} onRefresh={onRefresh} />)
    const download = await screen.findByRole('link', { name: 'Tải về Slide đầu' })
    expect(download).toHaveAttribute('href', slides[0]!.url)
    expect(download).toHaveAttribute('target', '_blank')
    expect(download).toHaveAttribute('rel', 'noopener noreferrer')

    fireEvent.click(screen.getByRole('tab', { name: 'Slide 2: Slide sau' }))
    const mockLoad = await screen.findByText('Load mock PDF')
    fireEvent.click(mockLoad)
    const error = await screen.findByRole('alert')
    expect(within(error).getByText('Không tải được tệp PDF.')).toBeInTheDocument()
    fireEvent.click(within(error).getByRole('button', { name: 'Tải lại' }))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('opens the PDF frame in fullscreen', async () => {
    const requestFullscreen = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(HTMLElement.prototype, 'requestFullscreen', { configurable: true, value: requestFullscreen })
    render(<LessonSlides slides={[slides[0]!]} onRefresh={vi.fn()} />)
    fireEvent.click(await screen.findByText('Load mock PDF'))
    const frame = screen.getByRole('group', { name: 'Trình xem Slide đầu' })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Mở rộng' })).toBeEnabled())
    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng' }))
    expect(requestFullscreen).toHaveBeenCalledOnce()
    expect(frame).toHaveAttribute('tabindex', '0')
  })
})
