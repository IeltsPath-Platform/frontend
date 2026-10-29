import { Eye, Pencil, Power, PowerOff } from 'lucide-react'
import { AdminRowMenu, type RowMenuItem } from '../../components/AdminRowMenu'
import type { TreeNode } from '../types'

/** What a row can do with its point. Editing and switching it on or off are left out for a reader who may not write. */
export interface PointActions {
  onView: (id: string) => void
  onEdit?: (node: TreeNode) => void
  onToggleStatus?: (node: TreeNode) => void
}

/** The "..." button at the end of a knowledge point's row: what can be done with the point. */
export function KnowledgePointMenu({ node, actions }: { node: TreeNode; actions: PointActions }) {
  const active = node.status === 'ACTIVE'
  const items: RowMenuItem[] = [
    { key: 'detail', label: 'Xem chi tiết', ariaLabel: `Xem chi tiết ${node.code}`, icon: <Eye aria-hidden="true" size={16} />, onSelect: () => actions.onView(node.id) },
  ]
  const { onEdit, onToggleStatus } = actions
  if (onEdit) items.push({ key: 'edit', label: 'Sửa', ariaLabel: `Sửa ${node.code}`, icon: <Pencil aria-hidden="true" size={16} />, onSelect: () => onEdit(node) })
  if (onToggleStatus) {
    items.push(active
      ? { key: 'deactivate', label: 'Ngừng dùng', ariaLabel: `Ngừng dùng ${node.code}`, icon: <PowerOff aria-hidden="true" size={16} />, tone: 'danger', onSelect: () => onToggleStatus(node) }
      : { key: 'activate', label: 'Kích hoạt', ariaLabel: `Kích hoạt ${node.code}`, icon: <Power aria-hidden="true" size={16} />, onSelect: () => onToggleStatus(node) })
  }
  return <AdminRowMenu items={items} label={`Hành động của ${node.code}`} />
}
