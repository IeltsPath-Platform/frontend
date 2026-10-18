import type { ReactionType } from '../utils/communityFormat'

interface IconProps {
  className?: string
  size?: number
}

/**
 * SVG Thích (Like) - Bàn tay ngón cái giơ lên trên nền gradient xanh dương
 */
export function LikeIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="likeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#2B87FF" />
          <stop offset="100%" stopColor="#0866FF" />
        </linearGradient>
        <filter id="likeShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#0866FF" floodOpacity="0.3" />
        </filter>
      </defs>
      <circle cx="18" cy="18" r="17" fill="url(#likeGradient)" filter="url(#likeShadow)" />
      <path
        d="M17.5 9.5C16.8 9.5 16.2 10.1 16.3 10.9L16.8 14.5H12.2C10.8 14.5 9.8 15.8 10.1 17.2L11.7 23.8C12 24.8 12.9 25.5 14 25.5H22C23.1 25.5 24 24.6 24 23.5V17.5C24 16.4 23.1 15.5 22 15.5H20.4L20.8 12.2C20.9 10.7 19.4 9.5 17.5 9.5Z"
        fill="white"
      />
      <rect x="8" y="16" width="3" height="9.5" rx="1" fill="#EBF3FF" />
    </svg>
  )
}

/**
 * SVG Yêu thích (Love) - Trái tim 3D đỏ rực rỡ với ánh sáng bóng
 */
export function LoveIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="loveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FF4D67" />
          <stop offset="100%" stopColor="#E41E3F" />
        </linearGradient>
        <radialGradient id="loveGlow" cx="35%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#FFA6B5" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FF4D67" stopOpacity="0" />
        </radialGradient>
        <filter id="loveShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#E41E3F" floodOpacity="0.35" />
        </filter>
      </defs>
      <circle cx="18" cy="18" r="17" fill="url(#loveGradient)" filter="url(#loveShadow)" />
      <circle cx="18" cy="18" r="17" fill="url(#loveGlow)" />
      <path
        d="M18 26.2C17.6 26.2 17.2 26 16.9 25.7C13.2 22.1 10 18.9 10 15.2C10 12.3 12.2 10.2 15.1 10.2C16.7 10.2 18.2 11 19 12.2C19.8 11 21.3 10.2 22.9 10.2C25.8 10.2 28 12.3 28 15.2C28 18.9 24.8 22.1 21.1 25.7C20.8 26 20.4 26.2 20 26.2H18Z"
        fill="white"
      />
    </svg>
  )
}

/**
 * SVG Hữu ích (Helpful) - Ngôi sao/bóng đèn vàng cam ấm áp rạng rỡ
 */
export function HelpfulIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="helpfulGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBBF24" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
        <radialGradient id="helpfulGlow" cx="35%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#FEF3C7" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#FBBF24" stopOpacity="0" />
        </radialGradient>
        <filter id="helpfulShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#D97706" floodOpacity="0.35" />
        </filter>
      </defs>
      <circle cx="18" cy="18" r="17" fill="url(#helpfulGradient)" filter="url(#helpfulShadow)" />
      <circle cx="18" cy="18" r="17" fill="url(#helpfulGlow)" />
      <path
        d="M18 9.5C14.7 9.5 12 12.2 12 15.5C12 17.6 13.1 19.4 14.8 20.4V22C14.8 22.6 15.2 23 15.8 23H20.2C20.8 23 21.2 22.6 21.2 22V20.4C22.9 19.4 24 17.6 24 15.5C24 12.2 21.3 9.5 18 9.5ZM16.5 24.5C16.5 25.1 16.9 25.5 17.5 25.5H18.5C19.1 25.5 19.5 25.1 19.5 24.5V24H16.5V24.5Z"
        fill="white"
      />
      <circle cx="18" cy="15.5" r="2.2" fill="#FEF3C7" />
    </svg>
  )
}

/**
 * SVG Chính xác (Accurate) - Khiên hoặc huy hiệu tròn xanh ngọc có dấu check trắng sắc sảo
 */
export function AccurateIcon({ size = 28, className = '' }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="accurateGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10B981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <radialGradient id="accurateGlow" cx="35%" cy="30%" r="50%">
          <stop offset="0%" stopColor="#A7F3D0" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
        </radialGradient>
        <filter id="accurateShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#047857" floodOpacity="0.35" />
        </filter>
      </defs>
      <circle cx="18" cy="18" r="17" fill="url(#accurateGradient)" filter="url(#accurateShadow)" />
      <circle cx="18" cy="18" r="17" fill="url(#accurateGlow)" />
      <path
        d="M15.5 23.2L11.2 18.9C10.7 18.4 10.7 17.6 11.2 17.1C11.7 16.6 12.5 16.6 13 17.1L16.4 20.5L23 13.2C23.5 12.7 24.3 12.6 24.8 13.1C25.3 13.6 25.4 14.4 24.9 14.9L17.3 23.2C16.8 23.7 16 23.7 15.5 23.2Z"
        fill="white"
      />
    </svg>
  )
}

export function ReactionIcon({
  type,
  size = 24,
  className = '',
}: {
  type: ReactionType
  size?: number
  className?: string
}) {
  switch (type) {
    case 'LIKE':
      return <LikeIcon size={size} className={className} />
    case 'LOVE':
      return <LoveIcon size={size} className={className} />
    case 'HELPFUL':
      return <HelpfulIcon size={size} className={className} />
    case 'ACCURATE':
      return <AccurateIcon size={size} className={className} />
    default:
      return null
  }
}

