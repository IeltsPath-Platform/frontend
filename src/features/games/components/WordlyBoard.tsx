import type { CSSProperties } from 'react'
import type { CurrentWord } from '../types/game'

const descriptions = {
  CORRECT: 'đúng vị trí',
  PRESENT: 'có trong từ, sai vị trí',
  ABSENT: 'không có trong từ',
}
type WordlyBoardProps = {
  word: CurrentWord
  draft: string
  revealing?: { wordId: string; attempt: number } | null
}

export function WordlyBoard({ word, draft, revealing }: WordlyBoardProps) {
  return (
    <div className="wordly-board-scroll">
      <div
        className="wordly-board"
        role="group"
        aria-label={`Bảng ${word.columns} chữ, ${word.maxAttempts} lượt`}
        style={{ '--word-columns': word.columns } as CSSProperties}
      >
        {Array.from({ length: word.maxAttempts }, (_, row) => {
          const guess = word.guesses.find(
            (item) => item.attemptNumber === row + 1,
          )
          const text = guess?.guess ?? (row === word.attemptsUsed ? draft : '')
          return (
            <div
              className="wordly-row"
              key={row}
              aria-label={`Lượt ${row + 1}`}
            >
              {Array.from({ length: word.columns }, (_, col) => {
                const status = guess?.letters[col]
                const flipping =
                  revealing?.wordId === word.playerWordId &&
                  revealing?.attempt === row + 1
                const typing = !guess && Boolean(text[col])
                return (
                  <span
                    className={`wordly-cell ${status ?? ''} ${flipping ? 'wordly-flip' : typing ? 'wordly-pop' : ''}`}
                    style={
                      { '--flip-delay': `${col * 140}ms` } as CSSProperties
                    }
                    key={`${col}:${text[col] ?? ''}`}
                    aria-label={`${text[col] ?? 'Trống'}${status ? `: ${descriptions[status]}` : ''}`}
                  >
                    {text[col] ?? ''}
                  </span>
                )
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
