import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/AuthGuards'
import { useAuthSession } from '@/features/auth/authSession'
import { hasAnyRole, signInDestination } from '@/features/auth/staffRoles'
import { BatchCreatedPage } from './sale-manager/BatchCreatedPage'
import { BatchDetailPage } from './sale-manager/BatchDetailPage'
import { BatchListPage } from './sale-manager/BatchListPage'
import { CreateBatchPage } from './sale-manager/CreateBatchPage'
import { IssueDirectPage } from './sale-manager/IssueDirectPage'
import { OverviewPage } from './sale-manager/OverviewPage'
import { IssuedKeysPage } from './sale/IssuedKeysPage'
import { IssuePage } from './sale/IssuePage'
import { PointLayout } from './shared/PointLayout'
import { MANAGER_BASE, SALE_BASE } from './shared/point-menu'

/**
 * Lets the children through only to the roles that may see this area. Anyone else goes to the page their own role starts
 * on, so a sale who types the manager's address lands on the sale's screen.
 */
function RoleArea({ roles, children }: { roles: readonly string[]; children: ReactNode }) {
  const session = useAuthSession()
  if (!hasAnyRole(session.roles, roles)) return <Navigate replace to={signInDestination(session.roles)} />
  return <>{children}</>
}

/** The key screens: the sales manager's area and the sale's area, each open only to its own role. */
export function PointManagementRoutes() {
  return (
    <RequireAuth>
      <Routes>
        <Route
          element={<RoleArea roles={['STAFF_MANAGER']}><PointLayout area="manager" /></RoleArea>}
          path="sale-manager"
        >
          <Route element={<Navigate replace to={`${MANAGER_BASE}/overview`} />} index />
          <Route element={<OverviewPage />} path="overview" />
          <Route element={<BatchListPage />} path="batches" />
          <Route element={<CreateBatchPage />} path="batches/new" />
          <Route element={<BatchDetailPage />} path="batches/:code" />
          <Route element={<BatchCreatedPage />} path="batches/:code/created" />
          <Route element={<IssueDirectPage />} path="issue" />
        </Route>
        <Route
          element={<RoleArea roles={['SALES_STAFF']}><PointLayout area="sale" /></RoleArea>}
          path="sale"
        >
          <Route element={<Navigate replace to={`${SALE_BASE}/issue`} />} index />
          <Route element={<IssuePage />} path="issue" />
          <Route element={<IssuedKeysPage />} path="issued" />
          <Route element={<Navigate replace to={`${SALE_BASE}/issue`} />} path="my-keys" />
        </Route>
        <Route element={<Navigate replace to={`${MANAGER_BASE}/overview`} />} path="*" />
      </Routes>
    </RequireAuth>
  )
}
