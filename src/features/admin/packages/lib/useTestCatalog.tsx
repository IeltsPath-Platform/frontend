import { useMemo, useState } from 'react'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminErrorToast } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import { archivePackage, listPackages, restorePackage } from '../api/packageApi'
import { listPackageStats } from '../api/packageStatsApi'
import { packageError } from './packageLabels'
import type { PackageListItem, PackageStats } from '../types'

/** The copy of the hide confirmation: a practice test leaves the library, a placement test leaves the placement choice. */
export interface HideCopy {
  title: string
  confirmLabel: string
  message: (pkg: PackageListItem) => string
}

/**
 * The shared state of a screen that manages one test type: the tests, their attempt statistics, and hiding or
 * restoring one (with a confirmation before hiding). Statistics are read from Assessment; if that fails the screen
 * still works and shows dashes.
 */
export function useTestCatalog(type: 'PRACTICE_TEST' | 'PLACEMENT_TEST', hide: HideCopy) {
  const tests = useAdminResource(`test-catalog:${type}`, (signal) => listPackages({ type }, signal))
  const rows = useMemo(() => tests.data ?? [], [tests.data])
  const ids = rows.map((row) => row.id).join(',')
  const statsResource = useAdminResource(`test-catalog-stats:${type}:${ids}`,
    (signal) => (rows.length ? listPackageStats(rows.map((row) => row.id), signal) : Promise.resolve([] as PackageStats[])))
  const stats = useMemo(() => statsResource.status === 'success'
    ? new Map((statsResource.data ?? []).map((item) => [item.packageId, item]))
    : undefined, [statsResource.status, statsResource.data])
  const [busy, setBusy] = useState(false)
  const fail = useAdminErrorToast()
  const { confirm, confirmDialog } = useAdminConfirm()

  async function toggleVisibility(pkg: PackageListItem) {
    if (busy) return
    const restoring = pkg.status === 'ARCHIVED'
    if (!restoring && !(await confirm({ title: hide.title, message: hide.message(pkg), confirmLabel: hide.confirmLabel, tone: 'danger' }))) return
    setBusy(true)
    try {
      if (restoring) await restorePackage(pkg.id)
      else await archivePackage(pkg.id)
      tests.reload()
    } catch (reason) {
      fail(packageError(reason))
    } finally {
      setBusy(false)
    }
  }

  return { tests, rows, stats, busy, toggleVisibility, confirmDialog }
}
