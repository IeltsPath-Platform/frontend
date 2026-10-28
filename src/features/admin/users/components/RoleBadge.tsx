import { USER_ROLE_LABEL } from '../lib/userLabels'
import type { UserRole } from '../types'
import '../user-table.css'

/** A role as a coloured pill; the colour follows the role, the text is its label. */
export function RoleBadge({ role }: { role: UserRole }) {
  return <span className={`adm-badge um-role um-role--${role.toLowerCase()}`}>{USER_ROLE_LABEL[role]}</span>
}
