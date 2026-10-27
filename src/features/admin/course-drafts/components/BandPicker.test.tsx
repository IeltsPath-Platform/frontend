import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BandPicker } from './BandPicker'

function Harness({ initial = 6.5 }: { initial?: number }) {
  const [band, setBand] = useState(initial)
  return <><BandPicker onChange={setBand} value={band} /><output>{band}</output></>
}

describe('BandPicker', () => {
  it('offers every band from 0.0 to 9.0 in steps of 0.5 as one choice', () => {
    render(<Harness />)
    const radios = screen.getAllByRole('radio')
    expect(radios).toHaveLength(19)
    expect(radios[0]).toHaveAccessibleName('0.0')
    expect(radios[18]).toHaveAccessibleName('9.0')
    expect(screen.getByRole('radio', { name: '6.5' })).toBeChecked()
  })

  it('changes the band with one click', () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole('radio', { name: '8.0' }))
    expect(screen.getByRole('radio', { name: '8.0' })).toBeChecked()
    expect(screen.getByRole('radio', { name: '6.5' })).not.toBeChecked()
    expect(screen.getByRole('status')).toHaveTextContent('8')
  })

  it('lights the CEFR level group of the chosen band', () => {
    const { container } = render(<Harness initial={5} />)
    expect(container.querySelector('.is-current .adm-band__level')).toHaveTextContent('B2')
    fireEvent.click(screen.getByRole('radio', { name: '4.5' }))
    expect(container.querySelector('.is-current .adm-band__level')).toHaveTextContent('B1')
  })
})
