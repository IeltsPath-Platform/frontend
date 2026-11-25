import { KeyRound, LayoutDashboard, ListChecks, Send } from 'lucide-react'
import type { MenuEntry } from '@/features/admin/adminMenu'

export const MANAGER_BASE = '/point-management/sale-manager'
export const SALE_BASE = '/point-management/sale'

/** The sidebar reuses the admin one, so each entry is a plain link; the route guard already limits who sees the area. */
export const MANAGER_MENU: readonly MenuEntry[] = [
  { kind: 'link', item: { path: `${MANAGER_BASE}/overview`, label: 'Tổng quan', icon: LayoutDashboard, roles: [] } },
  { kind: 'link', item: { path: `${MANAGER_BASE}/batches`, label: 'Đợt key', icon: KeyRound, roles: [] } },
  { kind: 'link', item: { path: `${MANAGER_BASE}/issue`, label: 'Phát key trực tiếp', icon: Send, roles: [] } },
]

export const SALE_MENU: readonly MenuEntry[] = [
  { kind: 'link', item: { path: `${SALE_BASE}/issue`, label: 'Phát hành key', icon: KeyRound, roles: [] } },
  { kind: 'link', item: { path: `${SALE_BASE}/issued`, label: 'Key đã phát hành', icon: ListChecks, roles: [] } },
]
