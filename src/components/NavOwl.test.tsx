import { createRef } from 'react'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { NavOwl } from './NavOwl'
import type { NavOwlHandle } from './NavOwl'

function mountOwl() {
  const ref = createRef<NavOwlHandle>()
  const view = render(<NavOwl ref={ref} />)
  const owl = view.container.querySelector<HTMLElement>('[data-state]')!
  return { ref, owl, unmount: view.unmount }
}

describe('NavOwl', () => {
  it('keeps walking when the same target is measured again', () => {
    const { ref, owl } = mountOwl()
    ref.current!.moveTo(100)
    ref.current!.moveTo(320)
    expect(owl.dataset.state).toBe('walk')

    ref.current!.moveTo(320)
    expect(owl.dataset.state).toBe('walk')
    expect(owl.style.transform).toBe('translateX(320px)')
    expect(owl.style.transition).not.toBe('none')
  })

  it('walks on from where the previous page left the owl', () => {
    const first = mountOwl()
    first.ref.current!.moveTo(140)
    first.unmount()

    const next = mountOwl()
    next.ref.current!.moveTo(460)
    expect(next.owl.dataset.state).toBe('walk')
    expect(next.owl.dataset.dir).toBe('right')
    expect(next.owl.style.transform).toBe('translateX(460px)')
    expect(next.owl.style.opacity).toBe('1')
  })
})
