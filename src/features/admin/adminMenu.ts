import { BookOpen, FileQuestion, LayoutDashboard, Network, type LucideIcon } from 'lucide-react'
import { hasAnyRole, type StaffRole } from '@/features/auth/staffRoles'

export interface AdminMenuItem {
  path: string
  label: string
  icon: LucideIcon
  /** Roles that see the item and may open its route. */
  roles: readonly StaffRole[]
  /** Match the path exactly, so `/admin` is not highlighted on every admin page. */
  end?: boolean
}

const AUTHORS: readonly StaffRole[] = ['ADMIN', 'CONTENT_AUTHOR']

export const ADMIN_MENU: readonly AdminMenuItem[] = [
  { path: '/admin', label: 'Tổng quan', icon: LayoutDashboard, roles: AUTHORS, end: true },
  { path: '/admin/knowledge-graph', label: 'Cây tri thức', icon: Network, roles: ['ADMIN', 'CONTENT_AUTHOR', 'EXAMINER'] },
  { path: '/admin/lessons', label: 'Bài học', icon: BookOpen, roles: AUTHORS },
  { path: '/admin/questions', label: 'Ngân hàng câu hỏi', icon: FileQuestion, roles: AUTHORS },
]

export function menuFor(roles: readonly string[] | undefined): AdminMenuItem[] {
  return ADMIN_MENU.filter((item) => hasAnyRole(roles, item.roles))
}

export function rolesFor(path: string): readonly StaffRole[] {
  return ADMIN_MENU.find((item) => item.path === path)?.roles ?? []
}
