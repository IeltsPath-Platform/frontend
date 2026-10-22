import { NavLink } from 'react-router-dom'
import type { AdminMenuItem } from './adminMenu'

export function AdminSidebar({ items }: { items: readonly AdminMenuItem[] }) {
  return (
    <nav aria-label="Menu quản trị" className="adm-sidebar">
      <ul>
        {items.map(({ path, label, icon: Icon, end }) => (
          <li key={path}>
            <NavLink className={({ isActive }) => `adm-nav${isActive ? ' is-active' : ''}`} end={end} to={path}>
              <Icon aria-hidden="true" size={20} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
