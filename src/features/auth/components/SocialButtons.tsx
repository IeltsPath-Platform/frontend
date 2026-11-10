import googleLogo from '@/assets/683d9a1a8150ee8b29bfd25d46804605.png'
import { Button } from '@/components/ui/button'
import type { SocialProvider } from '../api/types'

export type { SocialProvider }

interface SocialButtonsProps {
  mode?: 'sign-in' | 'sign-up'
  onSelect: (provider: SocialProvider) => void
  disabled?: boolean
}

export function SocialButtons({ mode = 'sign-in', onSelect, disabled = false }: SocialButtonsProps) {
  const actionVerb = mode === 'sign-up' ? 'Đăng ký' : 'Đăng nhập'

  return (
    <div className="auth-social-buttons" aria-label="Đăng nhập qua mạng xã hội">
      <Button
        type="button"
        variant="outline"
        className="auth-social-button"
        disabled={disabled}
        title={disabled ? `${actionVerb} với Google chưa được hỗ trợ` : undefined}
        onClick={() => onSelect('Google')}
      >
        <img src={googleLogo} alt="" aria-hidden="true" width={18} height={18} className="size-[18px] shrink-0 object-contain" />
        <span key={`google-${mode}`} className="auth-social-label-morph">{`${actionVerb} với Google`}</span>
      </Button>
    </div>
  )
}
