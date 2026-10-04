import googleLogo from '@/assets/683d9a1a8150ee8b29bfd25d46804605.png'
import { Button } from '@/components/ui/button'
import type { SocialProvider } from '../api/types'

export type { SocialProvider }

interface SocialButtonsProps {
  onSelect: (provider: SocialProvider) => void
  disabled?: boolean
}

export function SocialButtons({ onSelect, disabled = false }: SocialButtonsProps) {
  return (
    <div className="auth-social-buttons" aria-label="Đăng nhập qua mạng xã hội">
      <Button
        type="button"
        variant="outline"
        className="auth-social-button"
        disabled={disabled}
        title={disabled ? 'Đăng nhập Google chưa được hỗ trợ' : undefined}
        onClick={() => onSelect('Google')}
      >
        <img src={googleLogo} alt="" aria-hidden="true" width={20} height={20} className="size-5 shrink-0 object-contain" />
        {disabled ? 'Google (chưa hỗ trợ)' : 'Continue with Google'}
      </Button>
    </div>
  )
}
