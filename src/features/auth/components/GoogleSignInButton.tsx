import { useEffect, useRef, useState } from 'react'
import { GOOGLE_CLIENT_ID } from '@/lib/env'
import { authApi } from '../api/authApi'
import { loadGoogleIdentityScript } from '../lib/googleIdentity'

/** A nonce is refreshed this long before the server says it expires. */
const NONCE_REFRESH_MARGIN_MS = 30_000

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void
  onError: (message: string) => void
  disabled?: boolean
}

interface IssuedNonce {
  nonce: string
  expiresInSeconds: number
}

/**
 * Asks the server for a nonce. While the server does not issue them (or is down) the button still works without one:
 * the server decides whether a credential without a nonce is accepted.
 */
async function requestNonce(): Promise<IssuedNonce | null> {
  try {
    return await authApi.googleNonce()
  } catch {
    return null
  }
}

export function GoogleSignInButton({ onCredential, onError, disabled = false }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const credentialRef = useRef(onCredential)
  const errorRef = useRef(onError)
  // Bumped after each credential (a nonce is single-use) and before a nonce expires; each bump re-initializes GIS.
  const [nonceRound, setNonceRound] = useState(0)

  useEffect(() => {
    credentialRef.current = onCredential
    errorRef.current = onError
  }, [onCredential, onError])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return
    let cancelled = false
    let refreshTimer: number | undefined
    const container = containerRef.current

    void Promise.all([loadGoogleIdentityScript(), requestNonce()]).then(([, issued]) => {
      if (cancelled || !container || !window.google) return
      if (issued) {
        refreshTimer = window.setTimeout(
          () => setNonceRound((round) => round + 1),
          Math.max(0, issued.expiresInSeconds * 1000 - NONCE_REFRESH_MARGIN_MS),
        )
      }
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        nonce: issued?.nonce,
        callback: (response) => {
          if (!response.credential) return
          credentialRef.current(response.credential)
          setNonceRound((round) => round + 1)
        },
      })
      container.replaceChildren()
      window.google.accounts.id.renderButton(container, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        width: Math.max(220, Math.floor(container.clientWidth)),
      })
    }).catch(() => {
      if (!cancelled) errorRef.current('Không tải được đăng nhập Google. Bạn vẫn có thể dùng email và mật khẩu.')
    })

    return () => {
      cancelled = true
      window.clearTimeout(refreshTimer)
      window.google?.accounts.id.cancel()
    }
  }, [nonceRound])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div className="auth-google-btn" data-disabled={disabled || undefined}>
      {/* Giao diện hiển thị; iframe Google trong suốt phủ lên trên để nhận click. */}
      <span className="auth-google-btn__face" aria-hidden="true">
        <GoogleLogo />
        <span>Tiếp tục với Google</span>
      </span>
      <div ref={containerRef} className="auth-google-btn__hit" />
      {disabled ? <div className="absolute inset-0 cursor-wait" aria-hidden="true" /> : null}
    </div>
  )
}

/** Logo "G" nhiều màu theo brand guideline của Google (không phải icon giao diện). */
function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}
