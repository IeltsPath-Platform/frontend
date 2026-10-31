const ALLOWED_IMAGE_HOSTS = ['images.unsplash.com', 'i.imgur.com']

export function isAllowedImageHost(hostname: string, configuredMediaHost = import.meta.env.VITE_SUPABASE_MEDIA_HOST) {
  const host = hostname.toLowerCase()
  const mediaHost = configuredMediaHost?.trim().toLowerCase()
  return ALLOWED_IMAGE_HOSTS.includes(host) || Boolean(mediaHost && host === mediaHost)
}

export function isUploadedVideo(raw: string, configuredMediaHost = import.meta.env.VITE_SUPABASE_MEDIA_HOST) {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return false
    if (url.hostname.toLowerCase().includes('supabase.co')) {
      const mediaHost = configuredMediaHost?.trim().toLowerCase()
      return Boolean(mediaHost && url.hostname.toLowerCase() === mediaHost
        && url.pathname.includes('/community/videos/'))
    }
    return /\.(mp4|webm|mov)$/i.test(url.pathname)
  } catch {
    return false
  }
}
