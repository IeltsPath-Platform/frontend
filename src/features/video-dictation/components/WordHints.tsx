import { Eye, EyeOff, Languages } from 'lucide-react'

interface WordHintsProps {
  words: string[]
  /** The pronunciation of each word, same order as `words`; a missing or null entry shows no pronunciation. */
  ipa: readonly (string | null)[]
  revealed: ReadonlySet<number>
  onToggle: (position: number) => void
  onToggleAll: () => void
  /** The Vietnamese meaning of the sentence; null when the sentence has none, which leaves the button out. */
  meaning: string | null
  meaningVisible: boolean
  onToggleMeaning: () => void
}

/**
 * Hints under the answer box. One tile per word of the sentence, covered at first: tapping a tile uncovers that word
 * with its pronunciation under it, and "Hiện tất cả" uncovers them all (or covers them again). "Xem nghĩa" shows the Vietnamese meaning of the sentence.
 */
export function WordHints({ words, ipa, revealed, onToggle, onToggleAll, meaning, meaningVisible, onToggleMeaning }: WordHintsProps) {
  const allShown = words.length > 0 && revealed.size >= words.length

  return (
    <div className="vdp-words">
      <div className="vdp-words__head">
        <span><Eye aria-hidden="true" size={15} />Nhấn vào ô để xem từ · câu có {words.length} từ</span>
        <div className="vdp-words__tools">
          {meaning ? (
            <button type="button" className="vdp-words__all" aria-pressed={meaningVisible} onClick={onToggleMeaning}>
              <Languages aria-hidden="true" size={15} />{meaningVisible ? 'Ẩn nghĩa' : 'Xem nghĩa'}
            </button>
          ) : null}
          <button type="button" className="vdp-words__all" onClick={onToggleAll}>
            {allShown ? <EyeOff aria-hidden="true" size={15} /> : <Eye aria-hidden="true" size={15} />}
            {allShown ? 'Ẩn tất cả' : 'Hiện tất cả'}
          </button>
        </div>
      </div>
      {meaning && meaningVisible ? <p className="vdp-meaning" role="note">{meaning}</p> : null}
      <ul className="vdp-words__list">
        {words.map((word, position) => {
          const shown = revealed.has(position)
          return (
            <li key={`${position}-${word}`}>
              <button
                type="button"
                className="vdp-word"
                data-shown={shown}
                data-word={word}
                data-ipa={ipa[position] ?? undefined}
                aria-pressed={shown}
                aria-label={shown ? word : `Từ ${position + 1}, bấm để xem`}
                onClick={() => onToggle(position)}
              >
                {shown ? (
                  <>
                    <span className="vdp-word__text">{word}</span>
                    {ipa[position] ? <span className="vdp-word__ipa" aria-hidden="true">{ipa[position]}</span> : null}
                  </>
                ) : (
                  <span className="vdp-word__mask" aria-hidden="true" />
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
