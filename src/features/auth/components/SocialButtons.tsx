import { GoogleSignInButton } from './GoogleSignInButton'

interface SocialButtonsProps {
  onGoogleCredential: (credential: string) => void
  onError: (message: string) => void
  disabled?: boolean
}

export function SocialButtons({ onGoogleCredential, onError, disabled = false }: SocialButtonsProps) {
  return (
    <div className="auth-social-buttons" aria-label="Đăng nhập qua mạng xã hội">
      <GoogleSignInButton onCredential={onGoogleCredential} onError={onError} disabled={disabled} />
    </div>
  )
}
