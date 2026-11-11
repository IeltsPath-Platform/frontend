import { useEffect, useRef } from 'react'
import { GOOGLE_CLIENT_ID } from '@/lib/env'
import { loadGoogleIdentityScript } from '../lib/googleIdentity'

interface GoogleSignInButtonProps {
  onCredential: (idToken: string) => void
  onError: (message: string) => void
  disabled?: boolean
}

export function GoogleSignInButton({ onCredential, onError, disabled = false }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const credentialRef = useRef(onCredential)
  const errorRef = useRef(onError)

  useEffect(() => {
    credentialRef.current = onCredential
    errorRef.current = onError
  }, [onCredential, onError])

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID || !containerRef.current) return
    let cancelled = false
    const container = containerRef.current

    void loadGoogleIdentityScript().then(() => {
      if (cancelled || !container || !window.google) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response) => {
          if (response.credential) credentialRef.current(response.credential)
        },
      })
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
      window.google?.accounts.id.cancel()
    }
  }, [])

  if (!GOOGLE_CLIENT_ID) return null

  return (
    <div className="relative w-full">
      <div ref={containerRef} className="auth-social-button min-h-10 w-full" />
      {disabled ? <div className="absolute inset-0 cursor-wait" aria-hidden="true" /> : null}
    </div>
  )
}
