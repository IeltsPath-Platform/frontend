import type { ReactNode } from 'react'

/**
 * An on/off setting: one yes-or-no choice about one thing ("Khóa học miễn phí", "Hiện mục chưa kích hoạt"). It is a real
 * checkbox with the switch role, so the keyboard and a screen reader treat it as the switch it looks like. Picking several
 * items from a list (roles, rows, knowledge points) stays a plain checkbox.
 */
export function AdminSwitch({ checked, onChange, disabled, children }: {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  children: ReactNode
}) {
  return <label className="adm-switch">
    <input checked={checked} className="adm-switch__input" disabled={disabled} onChange={(event) => onChange(event.target.checked)} role="switch" type="checkbox" />
    <span aria-hidden="true" className="adm-switch__track" />
    <span className="adm-switch__label">{children}</span>
  </label>
}
