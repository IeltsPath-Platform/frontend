import { Activity, BookOpen, FileQuestion, Gauge, LayoutDashboard, Network, Server, Users, type LucideIcon } from 'lucide-react'
import { hasAnyRole, type StaffRole } from '@/features/auth/staffRoles'

export interface AdminMenuItem {
  path: string
  label: string
  icon: LucideIcon
  /** Roles that see the item and may open its route. */
  roles: readonly StaffRole[]
}

export const ADMIN_MENU: readonly AdminMenuItem[] = [
  { path: '/admin/system', label: 'Tổng quan hệ thống', icon: Gauge, roles: ['ADMIN'] },
  { path: '/admin/users', label: 'Người dùng', icon: Users, roles: ['ADMIN'] },
  { path: '/admin/services', label: 'Dịch vụ', icon: Server, roles: ['ADMIN'] },
  { path: '/admin/activity', label: 'Hoạt động', icon: Activity, roles: ['ADMIN'] },
  { path: '/admin/content', label: 'Tổng quan nội dung', icon: LayoutDashboard, roles: ['CONTENT_AUTHOR'] },
  { path: '/admin/knowledge-graph', label: 'Cây tri thức', icon: Network, roles: ['CONTENT_AUTHOR', 'EXAMINER'] },
  { path: '/admin/lessons', label: 'Bài học', icon: BookOpen, roles: ['CONTENT_AUTHOR'] },
  { path: '/admin/questions', label: 'Ngân hàng câu hỏi', icon: FileQuestion, roles: ['CONTENT_AUTHOR'] },
]

export function menuFor(roles: readonly string[] | undefined): AdminMenuItem[] {
  return ADMIN_MENU.filter((item) => hasAnyRole(roles, item.roles))
}

export function rolesFor(path: string): readonly StaffRole[] {
  return ADMIN_MENU.find((item) => item.path === path)?.roles ?? []
}
