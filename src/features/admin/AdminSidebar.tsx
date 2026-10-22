import { NavLink } from 'react-router-dom'
import type { AdminMenuItem } from './adminMenu'

export function AdminSidebar({ items }: { items: readonly AdminMenuItem[] }) {
  return (
    <nav aria-label="Menu quản trị" className="adm-sidebar">
      <ul>
        {items.map(({ path, label, icon: Icon }) => (
          <li key={path}>
            <NavLink className={({ isActive }) => `adm-nav${isActive ? ' is-active' : ''}`} to={path}>
              <Icon aria-hidden="true" size={20} />
              <span>{label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
