import { act, fireEvent, render, screen, within } from '@/test/render'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AdminDetails, AdminDrawer, AdminModal } from './AdminLayer'

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

/** jsdom has no stylesheet animations, so report one for the panel and leave every other style as it is. */
function stubAnimation(name: string) {
  const real = window.getComputedStyle.bind(window)
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => new Proxy(real(element, pseudo), {
    get(target, key) {
      if (key === 'animationName') return name
      const value = Reflect.get(target, key)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }))
}

describe('AdminDrawer', () => {
  it('slides in as a dialog named by its title and focuses the first field', () => {
    render(<AdminDrawer title="Tạo mã" onClose={vi.fn()}><form><input aria-label="Mã" /><button type="submit">Lưu</button></form></AdminDrawer>)
    const drawer = screen.getByRole('dialog', { name: 'Tạo mã' })
    expect(drawer).toHaveClass('adm-drawer', 'adm-drawer--md')
    expect(screen.getByLabelText('Mã')).toHaveFocus()
  })

  it('uses the wide variant when asked', () => {
    render(<AdminDrawer title="Soạn" size="lg" onClose={vi.fn()}>nội dung</AdminDrawer>)
    expect(screen.getByRole('dialog', { name: 'Soạn' })).toHaveClass('adm-drawer--lg')
  })

  it('closes from the back arrow, from Esc and from the close handed to its content', () => {
    const onClose = vi.fn()
    render(<AdminDrawer title="Tạo" onClose={onClose}>{(close) => <button onClick={close} type="button">Hủy</button>}</AdminDrawer>)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(onClose).toHaveBeenCalledTimes(3)
  })

  it('stays open when the overlay is clicked, so a half-filled form is not lost', () => {
    const onClose = vi.fn()
    render(<AdminDrawer title="Tạo" onClose={onClose}>nội dung</AdminDrawer>)
    fireEvent.pointerDown(document.querySelector('.adm-layer__overlay')!)
    fireEvent.click(document.querySelector('.adm-layer__overlay')!)
    expect(onClose).not.toHaveBeenCalled()
  })

  it('plays the exit animation before asking its owner to unmount it', () => {
    vi.useFakeTimers()
    stubAnimation('adm-drawer-in')
    const onClose = vi.fn()
    render(<AdminDrawer title="Tạo" onClose={onClose}>nội dung</AdminDrawer>)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(screen.getByRole('dialog')).toHaveClass('is-closing')
    expect(onClose).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(200) })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('closes at once when nothing animates', () => {
    stubAnimation('none')
    const onClose = vi.fn()
    render(<AdminDrawer title="Tạo" onClose={onClose}>nội dung</AdminDrawer>)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('carries the admin tokens even though it is portalled out of the admin theme', () => {
    render(<AdminDrawer title="Tạo" onClose={vi.fn()}>nội dung</AdminDrawer>)
    expect(screen.getByRole('dialog').closest('.adm-theme')).not.toBeNull()
  })
})

describe('AdminModal', () => {
  it('shows a record in a centred dialog with its description and details', () => {
    render(<AdminModal title="Sai chính tả" description="SPELLING" onClose={vi.fn()}><AdminDetails items={[{ label: 'Nhóm lỗi', value: 'Chính tả' }]} /></AdminModal>)
    const modal = screen.getByRole('dialog', { name: 'Sai chính tả' })
    expect(modal).toHaveClass('adm-modal')
    expect(modal).toHaveTextContent('SPELLING')
    expect(within(modal).getByText('Nhóm lỗi').tagName).toBe('DT')
    expect(within(modal).getByText('Chính tả').tagName).toBe('DD')
  })

  it('closes from the close button and from Esc', () => {
    const onClose = vi.fn()
    render(<AdminModal title="Chi tiết" onClose={onClose}>nội dung</AdminModal>)
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closes from a click outside it', async () => {
    const onClose = vi.fn()
    render(<AdminModal title="Chi tiết" onClose={onClose}>nội dung</AdminModal>)
    // The dialog starts listening for outside clicks one tick after it mounts.
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)) })
    fireEvent.pointerDown(document.body)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
