import { Navigate, Route, Routes } from 'react-router-dom'
import { BatchCreatedPage } from './sale-manager/BatchCreatedPage'
import { BatchDetailPage } from './sale-manager/BatchDetailPage'
import { BatchListPage } from './sale-manager/BatchListPage'
import { CreateBatchPage } from './sale-manager/CreateBatchPage'
import { OverviewPage } from './sale-manager/OverviewPage'
import { IssuedKeysPage } from './sale/IssuedKeysPage'
import { IssuePage } from './sale/IssuePage'
import { PointLayout } from './shared/PointLayout'
import { MANAGER_BASE, SALE_BASE } from './shared/point-menu'

/**
 * Demo screens for the key batch flow, open without signing in: type the address to reach them.
 * /point-management/sale-manager/overview  and  /point-management/sale/issue (the old /sale/my-keys forwards there)
 */
export function PointManagementRoutes() {
  return (
    <Routes>
      <Route element={<PointLayout area="manager" />} path="sale-manager">
        <Route element={<Navigate replace to={`${MANAGER_BASE}/overview`} />} index />
        <Route element={<OverviewPage />} path="overview" />
        <Route element={<BatchListPage />} path="batches" />
        <Route element={<CreateBatchPage />} path="batches/new" />
        <Route element={<BatchDetailPage />} path="batches/:code" />
        <Route element={<BatchCreatedPage />} path="batches/:code/created" />
      </Route>
      <Route element={<PointLayout area="sale" />} path="sale">
        <Route element={<Navigate replace to={`${SALE_BASE}/issue`} />} index />
        <Route element={<IssuePage />} path="issue" />
        <Route element={<IssuedKeysPage />} path="issued" />
        <Route element={<Navigate replace to={`${SALE_BASE}/issue`} />} path="my-keys" />
      </Route>
      <Route element={<Navigate replace to={`${MANAGER_BASE}/overview`} />} path="*" />
    </Routes>
  )
}
