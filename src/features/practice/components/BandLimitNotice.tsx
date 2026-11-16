import { AlertTriangle } from 'lucide-react'
import './band-limit-notice.css'

/**
 * The band caps that lowered a result. Writing and Speaking both show them through this one notice; the page picks
 * the class so it keeps its own spacing.
 */
export function BandLimitNotice({ messages, className = 'band-limit-notice' }: { messages: string[]; className?: string }) {
  if (messages.length === 0) return null
  return <div className={className} role="alert">
    <AlertTriangle size={16} aria-hidden="true" />
    <div>
      <b>Band bị giới hạn vì:</b>
      <ul>{messages.map((message, index) => <li key={index}>{message.replace(/ nên band bị giới hạn\.?$/, '').replace(/\.$/, '')}</li>)}</ul>
    </div>
  </div>
}
