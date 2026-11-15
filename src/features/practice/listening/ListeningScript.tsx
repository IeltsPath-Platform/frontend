import type { ReactNode } from 'react'
import { splitScriptLine } from './scriptLine'

const TONES = 4

/**
 * The script of a Listening recording as a conversation: every speaker has a colour, the name is shown when the speaker
 * changes and the words sit in a bubble. `renderWords(line, index, offset)` draws the words of one line (the review uses
 * it to mark the evidence of an answer, whose position counts from the start of the whole line).
 */
export function ListeningScript({ lines, renderWords }: {
  lines: readonly string[]
  renderWords: (line: string, index: number, offset: number) => ReactNode
}) {
  // Worked out in one pass before anything is drawn, so no variable is reassigned from inside a render callback.
  const tones = new Map<string, number>()
  const rows: { line: string; offset: number; speaker: string | null; showName: boolean; tone: number | undefined }[] = []
  let previous: string | null = null
  for (const line of lines) {
    const { speaker, offset } = splitScriptLine(line)
    if (speaker && !tones.has(speaker)) tones.set(speaker, tones.size % TONES)
    rows.push({ line, offset, speaker, showName: speaker !== null && speaker !== previous, tone: speaker ? tones.get(speaker) : undefined })
    previous = speaker
  }
  return (
    <>
      {rows.map(({ line, offset, speaker, showName, tone }, index) => (
        <div key={index} className={`rv-script-line${showName ? ' has-name' : ''}`} data-tone={tone}>
          {showName && <span className="rv-script-speaker">{speaker}</span>}
          <p className="rv-script-words">{renderWords(line, index, offset)}</p>
        </div>
      ))}
    </>
  )
}
