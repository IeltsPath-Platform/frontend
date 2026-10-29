import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import '../admin.css'

/** Shown instead of a redirect so a missing role is explained. Works inside the shell and on its own. */
export function AdminForbiddenPage() {
  return (
    <div className="adm-theme adm-forbidden">
      <ShieldAlert aria-hidden="true" size={40} />
      <h1>Bạn không có quyền truy cập</h1>
      <p className="adm-muted">Khu vực này chỉ dành cho tài khoản quản trị, Content Author hoặc Examiner.</p>
      <Link className="adm-btn adm-btn--primary" to="/overview">Về trang học</Link>
    </div>
  )
}
