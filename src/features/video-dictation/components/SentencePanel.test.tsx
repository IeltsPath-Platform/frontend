import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { DictationSegment } from '../api/videoDictationApi'
import { SentencePanel } from './SentencePanel'

const segment = (sequenceNo: number, transcript: string): DictationSegment => ({
  id: `s${sequenceNo}`, sequenceNo, startMs: 0, endMs: 1000, transcript, translationVi: null, ipaWords: [],
})
const segments = [segment(1, 'Hello there friend'), segment(2, 'See you soon')]

describe('SentencePanel', () => {
  it('shows the text of a passed sentence and only bars for the others, and jumps to a clicked sentence', () => {
    const onGoTo = vi.fn()
    render(<SentencePanel segments={segments} stats={{ s1: { attempts: 1, bestAccuracyPercent: 100, passed: true } }}
      current={1} passed={1} onGoTo={onGoTo} />)

    expect(screen.getByText('Hello there friend')).toBeInTheDocument()
    expect(screen.queryByText('See you soon')).not.toBeInTheDocument()
    expect(screen.getByText('Đang học')).toBeInTheDocument()
    expect(screen.getByText('1 / 2 câu')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Câu 1, đã qua' }))
    expect(onGoTo).toHaveBeenCalledWith(0)
  })
})
