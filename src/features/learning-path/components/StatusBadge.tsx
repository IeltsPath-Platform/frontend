import type { StatusMeta } from '../lib/statusMeta'

export function StatusBadge({ meta, className = '' }: { meta: StatusMeta; className?: string }) {
  const Icon = meta.icon
  return (
    <span className={`lp-badge lp-tone-${meta.tone} ${className}`.trim()}>
      <Icon aria-hidden="true" size={13} />
      {meta.label}
    </span>
  )
}
