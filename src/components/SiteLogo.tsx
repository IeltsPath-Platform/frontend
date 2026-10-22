import { useState } from 'react'
import fallbackMark from '@/assets/faviconV2.png'
import { BRAND_LOGO_URL } from './brandLogo'

interface SiteLogoProps {
  className?: string
  alt?: string
  loading?: 'lazy' | 'eager'
}

/**
 * The logo is hosted on the company site; when that host is unreachable (blocked DNS, offline) a bundled mark and
 * the brand name are shown instead of a broken image.
 */
export function SiteLogo({ className, alt = 'The English Space', loading }: SiteLogoProps) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return (
      <span className={`brand-logo-fallback ${className ?? ''}`} role="img" aria-label={alt}>
        <img src={fallbackMark} alt="" width={30} height={27} />
        <span>IELTS <b>Space</b></span>
      </span>
    )
  }
  return <img className={className} src={BRAND_LOGO_URL} alt={alt} width={175} height={74} loading={loading} decoding="async" onError={() => setFailed(true)} />
}
