import { Activity, BookOpen, FileQuestion, Gauge, LayoutDashboard, Network, Server, Users, type LucideIcon } from 'lucide-react'
import { hasAnyRole, type StaffRole } from '@/features/auth/staffRoles'
import { BadgeCheck, Bug, ClipboardList, Library, ListTodo, Scale, Sparkles, UserCheck } from 'lucide-react'
import { QUESTION_DRAFTS_ENABLED } from './ai-drafts/draftFlags'

export interface AdminMenuItem {
  path: string
  label: string
  icon: LucideIcon
  /** Roles that see the item and may open its route. */
  roles: readonly StaffRole[]
  enabled?: boolean
}

export const ADMIN_MENU: readonly AdminMenuItem[] = [
  { path: '/admin/system', label: 'Tổng quan hệ thống', icon: Gauge, roles: ['ADMIN'] },
  { path: '/admin/users', label: 'Người dùng', icon: Users, roles: ['ADMIN'] },
  { path: '/admin/services', label: 'Dịch vụ', icon: Server, roles: ['ADMIN'] },
  { path: '/admin/activity', label: 'Hoạt động', icon: Activity, roles: ['ADMIN'] },
  { path: '/content-author/content', label: 'Tổng quan nội dung', icon: LayoutDashboard, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/courses', label: 'Khóa học & chủ đề', icon: Library, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/knowledge-graph', label: 'Cây tri thức', icon: Network, roles: ['CONTENT_AUTHOR', 'EXAMINER'] },
  { path: '/content-author/lessons', label: 'Bài học', icon: BookOpen, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/questions', label: 'Ngân hàng câu hỏi', icon: FileQuestion, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/packages', label: 'Đề & gói câu hỏi', icon: ClipboardList, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/course-drafts', label: 'Dựng khóa học', icon: Library, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/course-import', label: 'Nhập Excel', icon: ClipboardList, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/work-items', label: 'Việc cần làm', icon: ListTodo, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/examiner-review', label: 'Đánh giá giám khảo', icon: UserCheck, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/ai-evaluation', label: 'Đánh giá AI chấm Writing', icon: BadgeCheck, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/rubrics', label: 'Rubric chấm Writing', icon: Scale, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/error-types', label: 'Mã lỗi', icon: Bug, roles: ['CONTENT_AUTHOR'] },
  { path: '/content-author/ai-drafts', label: 'Sinh nội dung bằng AI', icon: Sparkles, roles: ['CONTENT_AUTHOR'], enabled: QUESTION_DRAFTS_ENABLED },
]

export function menuFor(roles: readonly string[] | undefined): AdminMenuItem[] {
  return ADMIN_MENU.filter((item) => item.enabled !== false && hasAnyRole(roles, item.roles)).map((item) =>
    item.path === '/content-author/knowledge-graph' && !hasAnyRole(roles, ['CONTENT_AUTHOR'])
      ? { ...item, path: '/admin/knowledge-graph' }
      : item,
  )
}

export function rolesFor(path: string): readonly StaffRole[] {
  const canonical = path.replace(/^\/admin\/(?=content$|knowledge-graph$|lessons$|questions$)/, '/content-author/')
  return ADMIN_MENU.find((item) => item.path === canonical)?.roles ?? []
}
