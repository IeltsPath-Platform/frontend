import { Activity, FileQuestion, Gauge, LayoutDashboard, Network, Server, Users, type LucideIcon } from 'lucide-react'
import { hasAnyRole, type StaffRole } from '@/features/auth/staffRoles'
import { BadgeCheck, Bug, ClipboardList, Library, ListTodo, Mic, PenLine, Scale, Sparkles, UserCheck, UserRound } from 'lucide-react'
import { QUESTION_DRAFTS_ENABLED } from './ai-drafts/draftFlags'

export interface AdminMenuItem {
  path: string
  label: string
  icon: LucideIcon
  /** Roles that see the item and may open its route. */
  roles: readonly StaffRole[]
  enabled?: boolean
  /** A screen reached by a link on another page: its route is guarded by `roles` like any other, but the sidebar leaves it out. */
  offMenu?: boolean
  /** Items sharing a group sit under one sidebar icon and open as a flyout on hover. */
  group?: MenuGroupId
}

export type MenuGroupId = 'curriculum' | 'questions' | 'grading'

export const MENU_GROUPS: Record<MenuGroupId, { label: string; icon: LucideIcon }> = {
  curriculum: { label: 'Chương trình học', icon: Library },
  questions: { label: 'Câu hỏi & đề', icon: FileQuestion },
  grading: { label: 'Chất lượng chấm', icon: Scale },
}

export const ADMIN_MENU: readonly AdminMenuItem[] = [
  { path: '/admin/system', label: 'Tổng quan hệ thống', icon: Gauge, roles: ['ADMIN'] },
  { path: '/admin/users', label: 'Người dùng', icon: Users, roles: ['ADMIN'] },
  { path: '/admin/services', label: 'Dịch vụ', icon: Server, roles: ['ADMIN'] },
  { path: '/admin/activity', label: 'Hoạt động', icon: Activity, roles: ['ADMIN'] },
  { path: '/admin/examiner', label: 'Tổng quan chấm bài', icon: LayoutDashboard, roles: ['EXAMINER'] },
  // Shown as plain links, never folded into a flyout: an examiner must see where to grade without hovering or clicking.
  { path: '/admin/grading/writing', label: 'Chấm Writing', icon: PenLine, roles: ['EXAMINER'] },
  { path: '/admin/grading/speaking', label: 'Chấm Speaking', icon: Mic, roles: ['EXAMINER'] },
  { path: '/admin/examiner/profile', label: 'Hồ sơ của tôi', icon: UserRound, roles: ['EXAMINER'], offMenu: true },
  { path: '/content-author/content', label: 'Tổng quan nội dung', icon: LayoutDashboard, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/courses', label: 'Khóa học & chủ đề', icon: Library, roles: ['CONTENT_AUTHOR'], group: 'curriculum' },
  { path: '/content-author/knowledge-graph', label: 'Cây tri thức', icon: Network, roles: ['CONTENT_AUTHOR', 'EXAMINER'], group: 'curriculum' },
  { path: '/content-author/questions', label: 'Ngân hàng câu hỏi', icon: FileQuestion, roles: ['CONTENT_AUTHOR'], group: 'questions' },
  { path: '/content-author/packages', label: 'Đề & gói câu hỏi', icon: ClipboardList, roles: ['CONTENT_AUTHOR'], group: 'questions' },
  { path: '/content-author/course-drafts', label: 'Dựng khóa học', icon: Library, roles: ['CONTENT_AUTHOR'], group: 'curriculum' },
  { path: '/content-author/course-import', label: 'Nhập Excel', icon: ClipboardList, roles: ['CONTENT_AUTHOR'], group: 'questions' },
  { path: '/content-author/work-items', label: 'Việc cần làm', icon: ListTodo, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/examiner-review', label: 'Đánh giá giám khảo', icon: UserCheck, roles: ['CONTENT_AUTHOR'], group: 'grading' },
  { path: '/content-author/ai-evaluation', label: 'Đánh giá AI chấm Writing', icon: BadgeCheck, roles: ['CONTENT_AUTHOR'], group: 'grading' },
  { path: '/content-author/rubrics', label: 'Rubric chấm Writing', icon: Scale, roles: ['CONTENT_AUTHOR'], group: 'grading' },
  { path: '/content-author/error-types', label: 'Mã lỗi', icon: Bug, roles: ['CONTENT_AUTHOR'], group: 'grading' },
  { path: '/content-author/ai-drafts', label: 'Sinh nội dung bằng AI', icon: Sparkles, roles: ['CONTENT_AUTHOR'], enabled: QUESTION_DRAFTS_ENABLED, group: 'questions' },
]

export function menuFor(roles: readonly string[] | undefined): AdminMenuItem[] {
  return ADMIN_MENU.filter((item) => item.enabled !== false && !item.offMenu && hasAnyRole(roles, item.roles)).map((item) =>
    item.path === '/content-author/knowledge-graph' && !hasAnyRole(roles, ['CONTENT_AUTHOR'])
      ? { ...item, path: '/admin/knowledge-graph' }
      : item,
  )
}

export type MenuGroupEntry = { kind: 'group'; id: MenuGroupId; label: string; icon: LucideIcon; items: AdminMenuItem[] }
export type MenuEntry = { kind: 'link'; item: AdminMenuItem } | MenuGroupEntry

/**
 * The sidebar rows for a user: ungrouped items stay single links, grouped items collapse under one icon placed where
 * the group's first item appears. A group the user sees only one item of is shown as that item's plain link.
 */
export function menuEntriesFor(roles: readonly string[] | undefined): MenuEntry[] {
  const entries: MenuEntry[] = []
  const groups = new Map<MenuGroupId, MenuGroupEntry>()
  for (const item of menuFor(roles)) {
    if (!item.group) {
      entries.push({ kind: 'link', item })
      continue
    }
    let group = groups.get(item.group)
    if (!group) {
      group = { kind: 'group', id: item.group, ...MENU_GROUPS[item.group], items: [] }
      groups.set(item.group, group)
      entries.push(group)
    }
    group.items.push(item)
  }
  return entries.map((entry): MenuEntry =>
    entry.kind === 'group' && entry.items.length === 1 ? { kind: 'link', item: entry.items[0] } : entry)
}

export function rolesFor(path: string): readonly StaffRole[] {
  if (path === '/admin/vocabulary' || path === '/content-author/vocabulary') {
    return ['CONTENT_AUTHOR', 'ADMIN']
  }
  const canonical = path.replace(/^\/admin\/(?=content$|knowledge-graph$|questions$)/, '/content-author/')
  return ADMIN_MENU.find((item) => item.path === canonical)?.roles ?? []
}
