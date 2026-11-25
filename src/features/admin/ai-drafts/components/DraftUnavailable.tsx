import { AdminEmpty } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'

export function DraftUnavailable() {
  return <AdminPage title="Duyệt câu hỏi AI"><AdminEmpty title="Tính năng đang chờ triển khai" /></AdminPage>
}
