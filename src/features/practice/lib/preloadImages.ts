/**
 * Starts loading the images and resolves once every one of them has loaded or failed, or after `timeoutMs`, or when `signal`
 * aborts. It never rejects: an image that cannot be loaded must not keep a page waiting. Used to show a list of cards with
 * their photos in place, instead of cards whose photos appear one after another.
 */
export function preloadImages(urls: readonly (string | null | undefined)[], timeoutMs: number, signal?: AbortSignal): Promise<void> {
  const unique = [...new Set(urls.filter((url): url is string => Boolean(url)))]
  if (unique.length === 0 || signal?.aborted) return Promise.resolve()

  return new Promise<void>((resolve) => {
    let pending = unique.length
    const finish = () => {
      window.clearTimeout(timer)
      signal?.removeEventListener('abort', finish)
      resolve()
    }
    const timer = window.setTimeout(finish, timeoutMs)
    signal?.addEventListener('abort', finish, { once: true })

    for (const url of unique) {
      const image = new Image()
      const done = () => { pending -= 1; if (pending === 0) finish() }
      image.onload = done
      image.onerror = done
      image.src = url
    }
  })
}
