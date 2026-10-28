import type { KeyStatus } from '../data/types'
import { MANAGER_STATUS_LABEL, SALE_STATUS_LABEL, type ManagerStatus } from '../data/selectors'

type Tone = 'ready' | 'given' | 'activated' | 'revoked' | 'expired'

const SALE_TONE: Record<KeyStatus, Tone> = {
  READY: 'ready',
  ISSUED: 'given',
  ACTIVATED: 'activated',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
}

const MANAGER_TONE: Record<ManagerStatus, Tone> = {
  READY: 'ready',
  GIVEN: 'given',
  ACTIVATED: 'activated',
  REVOKED: 'revoked',
  EXPIRED: 'expired',
}

export function ManagerStatusBadge({ status }: { status: ManagerStatus }) {
  return <span className={`pm-badge pm-badge--${MANAGER_TONE[status]}`}>{MANAGER_STATUS_LABEL[status]}</span>
}

export function SaleStatusBadge({ status }: { status: KeyStatus }) {
  return <span className={`pm-badge pm-badge--${SALE_TONE[status]}`}>{SALE_STATUS_LABEL[status]}</span>
}
