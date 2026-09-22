import { Outlet } from "react-router-dom"
import { Footer } from "@/components/common/Footer"
import { Header } from "@/components/common/Header"

export function MainLayout() {
  return (
    <div className="site-shell">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <Header />
      <Outlet />
      <Footer />
    </div>
  )
}
