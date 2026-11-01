import type { ReactNode } from 'react'

// "Receptionist: Hello." -> speaker "Receptionist". A line without a speaker label (a talk read by one voice, a note) has no chip.
const SPEAKER_LINE = /^([A-Z][A-Za-z.' ]{0,28}):\s+/
const TONES = 4

/** Splits the script line of a recording into the speaker and the words, and how many characters the label took. */
export function splitScriptLine(line: string): { speaker: string | null; offset: number } {
  const match = SPEAKER_LINE.exec(line)
  return match ? { speaker: match[1], offset: match[0].length } : { speaker: null, offset: 0 }
}

/**
 * The script of a Listening recording as a conversation: every speaker has a colour, the name is shown when the speaker
 * changes and the words sit in a bubble. `renderWords(line, index, offset)` draws the words of one line (the review uses
 * it to mark the evidence of an answer, whose position counts from the start of the whole line).
 */
export function ListeningScript({ lines, renderWords }: {
  lines: readonly string[]
  renderWords: (line: string, index: number, offset: number) => ReactNode
}) {
  const tones = new Map<string, number>()
  let previous: string | null = null
  return (
    <>
      {lines.map((line, index) => {
        const { speaker, offset } = splitScriptLine(line)
        if (speaker && !tones.has(speaker)) tones.set(speaker, tones.size % TONES)
        const showName = speaker !== null && speaker !== previous
        previous = speaker
        return (
          <div key={index} className={`rv-script-line${showName ? ' has-name' : ''}`} data-tone={speaker ? tones.get(speaker) : undefined}>
            {showName && <span className="rv-script-speaker">{speaker}</span>}
            <p className="rv-script-words">{renderWords(line, index, offset)}</p>
          </div>
        )
      })}
    </>
  )
}
