import { AdminEmpty } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'

export function DraftUnavailable() {
  return <AdminPage title="Sinh nội dung bằng AI"><AdminEmpty title="Tính năng đang chờ triển khai" /></AdminPage>
}
