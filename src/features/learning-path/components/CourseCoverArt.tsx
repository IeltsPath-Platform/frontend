import { useState } from 'react'
import { CourseArt } from './CourseArt'

/** A course image with the existing band illustration as its empty and failed-image fallback. */
export function CourseCoverArt({ band, coverImageUrl, wide = false, loading }: {
  band: number
  coverImageUrl?: string | null
  wide?: boolean
  loading?: 'eager' | 'lazy'
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const url = coverImageUrl?.trim() || null

  return url && failedUrl !== url
    ? <img className="lp-art lp-cover-image" src={url} alt="" aria-hidden="true" loading={loading ?? 'lazy'} onError={() => setFailedUrl(url)} />
    : <CourseArt band={band} wide={wide} />
}
