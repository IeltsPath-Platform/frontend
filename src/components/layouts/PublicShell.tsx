import { Outlet } from "react-router-dom"
import { SiteFooter } from "@/components/common/SiteFooter"
import { TopBar } from "@/components/common/TopBar"

export function PublicShell() {
  return (
    <div className="site">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <TopBar />
      <Outlet />
      <SiteFooter />
    </div>
  )
}
