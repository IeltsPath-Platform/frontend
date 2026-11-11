import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ListeningScript } from './ListeningScript'
import { splitScriptLine } from './scriptLine'

describe('splitScriptLine', () => {
  it('takes the speaker label off a line', () => {
    expect(splitScriptLine('Mr Brown: The conclusion is too short.')).toEqual({ speaker: 'Mr Brown', offset: 10 })
  })

  it('leaves a line without a label alone, even with a time in it', () => {
    expect(splitScriptLine('The shop opens at 9:30 every day.')).toEqual({ speaker: null, offset: 0 })
  })
})

describe('ListeningScript', () => {
  const lines = ['Lena: Thank you.', 'Mr Brown: Yes, at least three books.', 'Mr Brown: And a clear conclusion.', 'Lena: I will try.']
  const renderWords = (line: string, _index: number, offset: number) => line.slice(offset)

  it('names a speaker only where the speaker changes and draws the words without the label', () => {
    const { container } = render(<ListeningScript lines={lines} renderWords={renderWords} />)

    expect(screen.getAllByText('Lena')).toHaveLength(2)
    expect(screen.getAllByText('Mr Brown')).toHaveLength(1)
    expect(screen.getByText('Yes, at least three books.')).toBeInTheDocument()
    expect(container.textContent).not.toContain('Lena: ')
  })

  it('gives each speaker a colour of their own', () => {
    const { container } = render(<ListeningScript lines={lines} renderWords={renderWords} />)

    const tones = Array.from(container.querySelectorAll('.rv-script-line')).map((line) => line.getAttribute('data-tone'))
    expect(tones).toEqual(['0', '1', '1', '0'])
  })
})
