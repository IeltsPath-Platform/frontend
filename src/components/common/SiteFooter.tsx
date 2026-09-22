import { Link } from "react-router-dom"

export function SiteFooter() {
  return (
    <footer className="site-foot">
      <div className="site-foot__grid">
        <div>
          <Link className="mark" to="/home"><span className="mark__stamp" aria-hidden="true">IP</span>IELTSPath</Link>
          <p>Phòng luyện IELTS trên máy: làm đề, xem lời giải, lưu từ và theo dõi band.</p>
        </div>
        <div>
          <strong>Luyện đề</strong>
          <Link to="/practice?skill=LISTENING">Listening</Link>
          <Link to="/practice?skill=READING">Reading</Link>
          <Link to="/practice?skill=WRITING">Writing</Link>
          <Link to="/practice?skill=SPEAKING">Speaking</Link>
        </div>
        <div>
          <strong>Học thêm</strong>
          <Link to="/roadmap">Lộ trình 7.0</Link>
          <Link to="/vocabulary">Sổ từ vựng</Link>
          <Link to="/dictation">Dictation</Link>
          <Link to="/blog">Blog</Link>
        </div>
        <div>
          <strong>Tài khoản</strong>
          <Link to="/auth/login">Đăng nhập</Link>
          <Link to="/auth/register">Tạo tài khoản</Link>
          <Link to="/community">Cộng đồng</Link>
          <Link to="/dashboard">Bảng tiến độ</Link>
        </div>
      </div>
      <p className="site-foot__copy">© 2026 IELTSPath. Đề trong kho là bài luyện gốc, không phải đề chính thức của hội đồng thi.</p>
    </footer>
  )
}
