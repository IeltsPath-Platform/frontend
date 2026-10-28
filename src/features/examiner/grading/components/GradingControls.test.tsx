import { fireEvent, render, screen, within } from '@testing-library/react'
import { useState } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { withPhrase } from '../lib/commentPhrases'
import { BandStepper } from './BandStepper'
import { SplitPane } from './SplitPane'

function Stepper({ start = null }: { start?: number | null }) {
  const [value, setValue] = useState<number | null>(start)
  return <><BandStepper label="Band X" onChange={setValue} value={value} /><output data-testid="value">{value === null ? 'none' : value}</output></>
}
const field = () => screen.getByLabelText('Band X')
const value = () => screen.getByTestId('value')

describe('BandStepper', () => {
  it('never fills in a score: an empty box stays empty until the examiner acts, and the first press is half a band from 0', () => {
    render(<Stepper />)
    expect(field()).toHaveValue('')
    expect(value()).toHaveTextContent('none')
    expect(screen.getByRole('button', { name: 'Giảm Band X' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: 'Tăng Band X' }))
    expect(value()).toHaveTextContent('0.5')
    fireEvent.click(screen.getByRole('button', { name: 'Tăng Band X' }))
    expect(value()).toHaveTextContent('1')
    fireEvent.click(screen.getByRole('button', { name: 'Giảm Band X' }))
    expect(value()).toHaveTextContent('0.5')
  })

  it('jumps to a usual band from the quick row, and shows which one is on', () => {
    render(<Stepper />)
    const row = within(screen.getByRole('group', { name: 'Chọn nhanh Band X' }))
    expect(row.getAllByRole('button').map((button) => button.textContent)).toEqual(['5.0', '5.5', '6.0', '6.5', '7.0', '7.5', '8.0'])
    expect(row.getAllByRole('button').every((button) => button.getAttribute('aria-pressed') === 'false')).toBe(true)

    fireEvent.click(row.getByRole('button', { name: '7.0' }))

    expect(value()).toHaveTextContent('7')
    expect(field()).toHaveValue('7.0')
    expect(row.getByRole('button', { name: '7.0' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Tăng Band X' }))
    expect(value()).toHaveTextContent('7.5')
    expect(row.getByRole('button', { name: '7.5' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('stops at 0 and at 9, disabling the button that would go past', () => {
    const { unmount } = render(<Stepper start={9} />)
    expect(screen.getByRole('button', { name: 'Tăng Band X' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Giảm Band X' })).toBeEnabled()
    unmount()
    render(<Stepper start={0} />)
    expect(screen.getByRole('button', { name: 'Giảm Band X' })).toBeDisabled()
  })

  it('moves with the arrow keys', () => {
    render(<Stepper start={6} />)
    fireEvent.keyDown(field(), { key: 'ArrowUp' })
    fireEvent.keyDown(field(), { key: 'ArrowUp' })
    fireEvent.keyDown(field(), { key: 'ArrowDown' })
    expect(value()).toHaveTextContent('6.5')
    expect(field()).toHaveValue('6.5')
  })

  it('takes a typed band, keeps "6." while it is typed, and shows it as 6.0 once the box loses focus', () => {
    render(<Stepper />)
    fireEvent.change(field(), { target: { value: '6.' } })
    expect(field()).toHaveValue('6.')
    expect(value()).toHaveTextContent('6')
    fireEvent.change(field(), { target: { value: '6.5' } })
    expect(value()).toHaveTextContent('6.5')
    fireEvent.change(field(), { target: { value: '7' } })
    fireEvent.blur(field())
    expect(field()).toHaveValue('7.0')
  })

  it('accepts a comma as the decimal sign', () => {
    render(<Stepper />)
    fireEvent.change(field(), { target: { value: '6,5' } })
    expect(value()).toHaveTextContent('6.5')
  })

  it('does not accept what is not a band, marks it, and goes back to the last good band on blur', () => {
    render(<Stepper start={6} />)
    for (const bad of ['10', '6.3', '-1', 'abc']) {
      fireEvent.change(field(), { target: { value: bad } })
      expect(value()).toHaveTextContent('6')
      expect(field()).toHaveAttribute('aria-invalid', 'true')
    }
    fireEvent.blur(field())
    expect(field()).toHaveValue('6.0')
    expect(field()).not.toHaveAttribute('aria-invalid')
  })

  it('clears the band when the box is emptied', () => {
    render(<Stepper start={6} />)
    fireEvent.change(field(), { target: { value: '' } })
    expect(value()).toHaveTextContent('none')
  })
})

describe('withPhrase', () => {
  it('adds a sentence after the text with a space, as the first sentence of an empty box, and never twice', () => {
    expect(withPhrase('', 'A.')).toBe('A.')
    expect(withPhrase('  ', 'A.')).toBe('A.')
    expect(withPhrase('Hay.  ', 'A.')).toBe('Hay. A.')
    expect(withPhrase('Hay. A.', 'A.')).toBe('Hay. A.')
  })
})

describe('SplitPane', () => {
  beforeEach(() => window.localStorage.clear())
  const show = () => render(<SplitPane left={<p>left</p>} right={<p>right</p>} storageKey="split-test" />)
  const bar = () => screen.getByRole('separator')

  it('shows both panes and starts at the default width', () => {
    show()
    expect(screen.getByText('left')).toBeInTheDocument()
    expect(screen.getByText('right')).toBeInTheDocument()
    expect(bar()).toHaveAttribute('aria-valuenow', '58')
  })

  it('moves with the arrow keys and stops at the limits (Home and End go straight to them)', () => {
    show()
    fireEvent.keyDown(bar(), { key: 'ArrowLeft' })
    expect(bar()).toHaveAttribute('aria-valuenow', '56')
    fireEvent.keyDown(bar(), { key: 'End' })
    expect(bar()).toHaveAttribute('aria-valuenow', '75')
    fireEvent.keyDown(bar(), { key: 'ArrowRight' })
    expect(bar()).toHaveAttribute('aria-valuenow', '75')
    fireEvent.keyDown(bar(), { key: 'Home' })
    expect(bar()).toHaveAttribute('aria-valuenow', '30')
    fireEvent.keyDown(bar(), { key: 'ArrowLeft' })
    expect(bar()).toHaveAttribute('aria-valuenow', '30')
  })

  it('ignores other keys, and goes back to the default width on a double click', () => {
    show()
    fireEvent.keyDown(bar(), { key: 'End' })
    fireEvent.keyDown(bar(), { key: 'a' })
    expect(bar()).toHaveAttribute('aria-valuenow', '75')
    fireEvent.doubleClick(bar())
    expect(bar()).toHaveAttribute('aria-valuenow', '58')
  })

  it('jumps to the reading, balanced and grading layouts and says which one is on', () => {
    show()
    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng bài viết' }))
    expect(bar()).toHaveAttribute('aria-valuenow', '70')
    expect(screen.getByRole('button', { name: 'Mở rộng bài viết' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Cân bằng' })).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(screen.getByRole('button', { name: 'Cân bằng' }))
    expect(bar()).toHaveAttribute('aria-valuenow', '50')
  })

  it('remembers the width for next time, and falls back to the default for a saved value that makes no sense', () => {
    const first = show()
    fireEvent.click(screen.getByRole('button', { name: 'Mở rộng chấm điểm' }))
    first.unmount()
    show().unmount()
    show()
    expect(bar()).toHaveAttribute('aria-valuenow', '36')
    cleanSaved()
    window.localStorage.setItem('split-test', '5')
    render(<SplitPane left={<p>l</p>} right={<p>r</p>} storageKey="split-test" />)
    expect(screen.getAllByRole('separator').at(-1)).toHaveAttribute('aria-valuenow', '58')
  })

  it('still works when the browser will not store the width', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked') })
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked') })
    show()
    fireEvent.keyDown(bar(), { key: 'ArrowLeft' })
    expect(bar()).toHaveAttribute('aria-valuenow', '56')
    setItem.mockRestore()
    getItem.mockRestore()
  })
})

function cleanSaved() {
  window.localStorage.removeItem('split-test')
}
