import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PronunciationBreakdown } from './PronunciationBreakdown'
import { parseSpeakingResult } from './speakingResultView'

const sounds = (...items: [string, number, string | null][]) => items.map(([symbol, accuracy, heardAs]) => ({ symbol, accuracy, heardAs }))

const display = {
  pronunciation: {
    weakWords: [{ word: 'think', accuracy: 52, sounds: sounds(['θ', 25, 's'], ['ɪ', 90, null]), tip: 'Đặt lưỡi giữa răng.' }],
    weakSounds: [{ symbol: 'θ', count: 3, accuracy: 25, heardAs: 's', words: ['think', 'thanks'], tip: 'Thổi hơi qua lưỡi.' }],
  },
  transcripts: [
    { partNo: 1, questionNo: 1, question: 'Tell me about school.', transcript: 'I think so', words: [
      { text: 'I', accuracy: 97, errorType: null, sounds: sounds(['aɪ', 97, null]) },
      { text: 'think', accuracy: 52, errorType: 'Mispronunciation', sounds: sounds(['θ', 25, 's'], ['ɪ', 90, null]) },
      { text: 'so', accuracy: 72, errorType: null, sounds: sounds(['s', 72, null], ['oʊ', 72, null]) },
    ] },
    { partNo: 1, questionNo: 2, question: 'Do you work?', transcript: 'Yes', words: [
      { text: 'yes', accuracy: 90, errorType: null, sounds: [] },
    ] },
  ],
}

describe('PronunciationBreakdown', () => {
  it('starts on the weakest word of the first answer and shows its sounds with their scores', () => {
    render(<PronunciationBreakdown view={parseSpeakingResult(display)} />)

    const word = screen.getByRole('button', { name: 'think' })
    expect(word).toHaveAttribute('aria-pressed', 'true')
    const row = screen.getByRole('list', { name: 'Các âm của từ think' })
    expect(within(row).getByLabelText('Âm θ: 25 điểm, cần luyện')).toHaveTextContent('nghe như /s/')
    expect(within(row).getByLabelText('Âm ɪ: 90 điểm, tốt')).toBeInTheDocument()
    expect(screen.getByText('Phát âm chưa đúng')).toBeInTheDocument()
    expect(screen.getByText(/Đặt lưỡi giữa răng/)).toBeInTheDocument()
  })

  it('shows another word when it is chosen', async () => {
    render(<PronunciationBreakdown view={parseSpeakingResult(display)} />)

    await userEvent.click(screen.getByRole('button', { name: 'so' }))

    expect(screen.getByRole('button', { name: 'so' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('list', { name: 'Các âm của từ so' })).toBeInTheDocument()
    expect(screen.getByText('72 điểm · tạm ổn')).toBeInTheDocument()
  })

  it('lists the sounds that were weak in several places, with what was heard instead and the tip', () => {
    render(<PronunciationBreakdown view={parseSpeakingResult(display)} />)

    const side = screen.getByRole('complementary', { name: 'Âm cần luyện nhất' })
    expect(side).toHaveTextContent('/θ/')
    expect(side).toHaveTextContent('Yếu ở 3 chỗ')
    expect(side).toHaveTextContent('Thường nghe như /s/')
    expect(within(side).getByText('think')).toBeInTheDocument()
    expect(within(side).getByText('thanks')).toBeInTheDocument()
    expect(side).toHaveTextContent('Thổi hơi qua lưỡi.')
  })

  it('switches between the answers and says when a word has no sound scores', async () => {
    render(<PronunciationBreakdown view={parseSpeakingResult(display)} />)

    await userEvent.click(screen.getByRole('button', { name: 'Part 1 · câu 2' }))

    expect(screen.getByText('Do you work?')).toBeInTheDocument()
    expect(screen.getByText('Chưa có điểm từng âm cho từ này.')).toBeInTheDocument()
  })

  it('still colours the words of a result stored before sounds were kept', () => {
    const old = { transcripts: [{ partNo: 1, questionNo: 1, question: '', transcript: 'a', words: [{ text: 'hello', accuracy: 50, errorType: null, sounds: [] }] }] }
    render(<PronunciationBreakdown view={parseSpeakingResult(old)} />)

    expect(screen.getByRole('button', { name: 'hello' })).toBeInTheDocument()
    expect(screen.getByText('Bài này chưa có điểm từng âm.')).toBeInTheDocument()
  })

  it('renders nothing when no answer carries words', () => {
    const { container } = render(<PronunciationBreakdown view={parseSpeakingResult({ transcripts: [{ partNo: 1, questionNo: 1, transcript: 'x' }] })} />)

    expect(container).toBeEmptyDOMElement()
  })
})