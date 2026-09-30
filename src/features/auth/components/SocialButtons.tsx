import googleLogo from '@/assets/683d9a1a8150ee8b29bfd25d46804605.png'
import { Button } from '@/components/ui/button'

export type SocialProvider = 'Google'

interface SocialButtonsProps {
  onSelect: (provider: SocialProvider) => void
}

export function SocialButtons({ onSelect }: SocialButtonsProps) {
  return (
    <div className="auth-social-buttons" aria-label="Đăng nhập qua mạng xã hội">
      <Button type="button" variant="outline" className="auth-social-button" onClick={() => onSelect('Google')}>
        <img src={googleLogo} alt="" aria-hidden="true" width={20} height={20} className="size-5 shrink-0 object-contain" /> Continue with Google
      </Button>
    </div>
  )
}
