import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { EssayGrade, PracticeEssay } from '~types/learningPath'
import { PracticeEssays } from './PracticeEssays'

const { submitPracticeEssay } = vi.hoisted(() => ({ submitPracticeEssay: vi.fn() }))

vi.mock('../api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api')>()),
  learningApi: { submitPracticeEssay },
}))

const essay: PracticeEssay = {
  id: 'essay-1',
  number: 1,
  prompt: 'Some people believe that university education should be free. To what extent do you agree?',
  task: 'TASK_2',
  minWords: 5,
  passBand: 5.5,
  latest: null,
}

const chartEssay: PracticeEssay = {
  ...essay,
  task: 'TASK_1',
  prompt: 'Country A rose from 20 to 40, while Country B fell from 50 to 30 between 2000 and 2020.',
  guide: '## 1. Overview\nCompare the main features.',
  images: [{ mediaUrl: 'https://example.test/chart.png', altText: 'Bar chart comparing two countries' }],
}

const grade: EssayGrade = {
  submissionId: 'submission-1',
  status: 'GRADED',
  wordCount: 6,
  overallBand: 6,
  passed: true,
  criteria: [
    { code: 'TR', band: 6, strengths: ['Clear position'], improvements: [] },
    { code: 'CC', band: 5.5, strengths: [], improvements: ['Link ideas more smoothly'] },
  ],
  corrections: [{ excerpt: 'peoples', suggestion: 'people', category: 'GRAMMAR' }],
  summary: 'A clear essay with a consistent position.',
  pointsCharged: 3,
  sampleAnswer: null,
}

function renderEssays(onFinish = vi.fn().mockResolvedValue(undefined)) {
  render(<PracticeEssays attemptId="attempt-1" essays={[essay]} finished={false} onExit={vi.fn()} onFinish={onFinish} />)
  return onFinish
}

function renderChartEssay(essayToRender: PracticeEssay = chartEssay) {
  render(<PracticeEssays attemptId="attempt-1" essays={[essayToRender]} finished={false} onExit={vi.fn()} onFinish={vi.fn()} />)
}

describe('PracticeEssays', () => {
  beforeEach(() => {
    submitPracticeEssay.mockReset()
  })

  it('shows the prompt and its requirements, and sends nothing until there is text', async () => {
    renderEssays()
    expect(screen.getByText(essay.prompt)).toBeInTheDocument()
    expect(screen.getByText('Tối thiểu 5 từ')).toBeInTheDocument()
    expect(screen.getByText('Đạt từ band 5.5')).toBeInTheDocument()
    const send = screen.getByRole('button', { name: 'Nộp để chấm' })
    expect(send).toBeDisabled()

    await userEvent.type(screen.getByRole('textbox', { name: 'Introduction' }), 'Free tuition helps')
    expect(screen.getByText('Word count: 3')).toBeInTheDocument()
    expect(screen.getByText('Còn thiếu 2 từ so với yêu cầu')).toBeInTheDocument()
    expect(send).toBeEnabled()
    expect(submitPracticeEssay).not.toHaveBeenCalled()
  })

  it('keeps the chart visible above the guide', async () => {
    renderChartEssay()
    await userEvent.click(screen.getByRole('button', { name: 'Hướng dẫn' }))
    expect(screen.getByRole('img', { name: 'Bar chart comparing two countries' })).toBeInTheDocument()
    expect(screen.getByLabelText('Biểu đồ của đề bài')).toBeInTheDocument()
  })

  it('does not render an empty chart rail when there is no chart', async () => {
    renderChartEssay({ ...essay, guide: chartEssay.guide })
    await userEvent.click(screen.getByRole('button', { name: 'Hướng dẫn' }))
    expect(screen.queryByLabelText('Biểu đồ của đề bài')).not.toBeInTheDocument()
  })

  it('opens the chart dialog from both the prompt and guide tabs', async () => {
    renderChartEssay()
    await userEvent.click(screen.getByRole('button', { name: 'Phóng to biểu đồ' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')

    await userEvent.click(screen.getByRole('button', { name: 'Hướng dẫn' }))
    await userEvent.click(screen.getByRole('button', { name: 'Phóng to biểu đồ' }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('shows a text fallback when the chart cannot load', async () => {
    renderChartEssay()
    fireEvent.error(screen.getByRole('img', { name: 'Bar chart comparing two countries' }))
    expect(screen.getByRole('status')).toHaveTextContent('Bar chart comparing two countries')
    expect(screen.getByRole('status')).toHaveTextContent('Không tải được biểu đồ. Số liệu có trong đề bài.')
  })

  it.each(['TASK_1', 'TASK_2'] as const)('previews the %s sample in the same fields and restores the draft', async (task) => {
    const sample = [
      'The introduction contains **a useful phrase**.',
      'This is the second sample paragraph.',
      'This is the third sample paragraph.',
      'This is the final sample paragraph.',
    ]
    renderChartEssay({ ...chartEssay, task, sampleAnswer: sample.join('\n\n') })
    const labels = task === 'TASK_1'
      ? ['Introduction', 'Overview', 'Body 1', 'Body 2']
      : ['Introduction', 'Body 1', 'Body 2', 'Conclusion']
    const fields = labels.map((name) => screen.getByRole('textbox', { name }))
    await userEvent.type(fields[0]!, 'My own introduction')
    await userEvent.type(fields[3]!, 'My own final paragraph')
    fields[0]!.style.height = '190px'

    await userEvent.click(screen.getByRole('switch', { name: 'Bài mẫu' }))

    labels.forEach((name, index) => {
      const field = screen.getByRole('textbox', { name })
      expect(field).toBe(fields[index])
      expect(field).toHaveAttribute('readonly')
      expect(field).toHaveValue(sample[index]!.replaceAll('**', ''))
    })
    expect(fields[0]).toHaveStyle({ height: '190px' })
    expect(screen.getByRole('button', { name: 'Nộp để chấm' })).toBeDisabled()
    expect(submitPracticeEssay).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('switch', { name: 'Bài mẫu' }))

    expect(fields[0]).toHaveValue('My own introduction')
    expect(fields[3]).toHaveValue('My own final paragraph')
    labels.forEach((name, index) => {
      expect(screen.getByRole('textbox', { name })).toBe(fields[index])
      expect(fields[index]).not.toHaveAttribute('readonly')
    })
    expect(fields[0]).toHaveStyle({ height: '190px' })
    expect(screen.getByRole('button', { name: 'Nộp để chấm' })).toBeEnabled()
  })

  it('keeps an older unsplit sample complete in the first field', async () => {
    renderChartEssay({ ...chartEssay, sampleAnswer: 'An older **complete** sample without paragraph breaks.' })
    await userEvent.click(screen.getByRole('switch', { name: 'Bài mẫu' }))
    expect(screen.getByRole('textbox', { name: 'Introduction' }))
      .toHaveValue('An older complete sample without paragraph breaks.')
    expect(screen.getByRole('textbox', { name: 'Overview' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Body 1' })).toHaveValue('')
    expect(screen.getByRole('textbox', { name: 'Body 2' })).toHaveValue('')
  })

  it('grades the essay, shows the result and lets the learner finish the set', async () => {
    submitPracticeEssay.mockResolvedValue(grade)
    const onFinish = renderEssays()
    await userEvent.type(screen.getByRole('textbox', { name: 'Introduction' }), 'Free tuition helps many students study')
    expect(screen.getByRole('button', { name: 'Hoàn thành bộ luyện tập' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Nộp để chấm' }))

    expect(submitPracticeEssay).toHaveBeenCalledWith('attempt-1', 'essay-1', expect.objectContaining({
      essayText: 'Free tuition helps many students study',
    }))
    expect(await screen.findByText('Đạt')).toBeInTheDocument()
    expect(screen.getByText('Band tổng').previousElementSibling).toHaveTextContent('6.0')
    expect(screen.getByText('Task Response')).toBeInTheDocument()
    expect(screen.getByText('Link ideas more smoothly')).toBeInTheDocument()
    expect(screen.getByText('peoples')).toBeInTheDocument()
    expect(screen.getByText('people')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Hoàn thành bộ luyện tập' }))
    await waitFor(() => expect(onFinish).toHaveBeenCalledTimes(1))
  })

  it('keeps the text and says nothing was charged when grading is unavailable', async () => {
    const { ApiError } = await import('../api')
    submitPracticeEssay.mockRejectedValue(new ApiError(503, 'GRADING_UNAVAILABLE', 'Grading is unavailable'))
    renderEssays()
    await userEvent.type(screen.getByRole('textbox', { name: 'Introduction' }), 'Free tuition helps many students study')
    await userEvent.click(screen.getByRole('button', { name: 'Nộp để chấm' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('chưa bị trừ điểm')
    expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveValue('Free tuition helps many students study')
    expect(screen.getByRole('button', { name: 'Hoàn thành bộ luyện tập' })).toBeDisabled()
  })

  it('reuses the request id when the same text is sent again after a failure', async () => {
    const { ApiError } = await import('../api')
    submitPracticeEssay.mockRejectedValueOnce(new ApiError(503, 'GRADING_UNAVAILABLE', 'x')).mockResolvedValue(grade)
    renderEssays()
    await userEvent.type(screen.getByRole('textbox', { name: 'Introduction' }), 'Free tuition helps many students study')
    await userEvent.click(screen.getByRole('button', { name: 'Nộp để chấm' }))
    await screen.findByRole('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Nộp để chấm' }))
    await screen.findByText('Đạt')

    const ids = submitPracticeEssay.mock.calls.map((call) => call[2].requestId)
    expect(ids[0]).toBe(ids[1])
  })

  it('shows the prompt, the writing and the dictionary together, and the dictionary does not touch the text', async () => {
    renderEssays()
    await userEvent.type(screen.getByRole('textbox', { name: 'Introduction' }), 'Free tuition helps')

    expect(screen.getByRole('button', { name: 'Tra từ vựng' })).toBeDisabled()
    expect(screen.getByText(essay.prompt)).toBeInTheDocument()

    expect(screen.getByRole('textbox', { name: 'Introduction' })).toHaveValue('Free tuition helps')
  })

  it('looks a word up on Wiktionary in a new tab and lists it', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    renderEssays()
    await userEvent.type(screen.getByLabelText('Từ cần tra'), 'giáo dục')
    await userEvent.click(screen.getByRole('button', { name: 'Tra từ vựng' }))

    expect(open).toHaveBeenCalledWith(expect.stringContaining('wiktionary.org'), '_blank', 'noopener,noreferrer')
    expect(screen.getByRole('link', { name: /giáo dục/ })).toBeInTheDocument()
    open.mockRestore()
  })
})
