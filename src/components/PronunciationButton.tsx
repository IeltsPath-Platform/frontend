import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { Volume2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from 'cn'
import {
  isPlayableAudio,
  setActiveAudio,
  stopActiveAudio,
  getActiveAudio,
} from '@/lib/pronunciation'
import { speak } from '@/features/flashcards/lib/speak'

export type PlaybackState = 'idle' | 'playing' | 'failed'

export interface PronunciationButtonProps
  extends Omit<React.ComponentProps<'button'>, 'children'> {
  lemma?: string
  src?: string | null
  ttsFallbackText?: string
  iconSize?: number
  showErrorMessage?: boolean
  errorClassName?: string
  variant?: React.ComponentProps<typeof Button>['variant']
  size?: React.ComponentProps<typeof Button>['size']
  children?: React.ReactNode
}

export function PronunciationButton({
  lemma,
  src,
  ttsFallbackText,
  iconSize = 18,
  showErrorMessage = false,
  errorClassName,
  className,
  variant,
  size,
  style,
  onClick,
  'aria-label': ariaLabelProp,
  title: titleProp,
  children,
  ...buttonProps
}: PronunciationButtonProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [state, setState] = useState<PlaybackState>('idle')

  const hasPlayable = isPlayableAudio(src)
  const hasFallback = Boolean(ttsFallbackText && ttsFallbackText.trim())
  const isAvailable = hasPlayable || hasFallback

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (getActiveAudio() === audioRef.current) {
        setActiveAudio(null)
      }
    }
  }, [])

  function play(event: React.MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    onClick?.(event)

    if (hasPlayable && typeof src === 'string') {
      stopActiveAudio()
      audioRef.current?.pause()

      const audio = new Audio(src)
      audioRef.current = audio
      setActiveAudio(audio)

      const settle = (next: PlaybackState) => {
        if (audioRef.current === audio) {
          setState(next)
          if (next !== 'playing' && getActiveAudio() === audio) {
            setActiveAudio(null)
          }
        }
      }

      audio.onended = () => settle('idle')
      audio.onpause = () => settle('idle')
      audio.onerror = () => settle('failed')

      setState('playing')
      audio.play().catch(() => settle('failed'))
    } else if (hasFallback && ttsFallbackText) {
      stopActiveAudio()
      speak(ttsFallbackText)
    }
  }

  const computedTitle = !isAvailable
    ? 'Chưa có audio'
    : titleProp ?? (state === 'failed' ? 'Chưa phát được âm thanh.' : undefined)

  const computedAriaLabel = !isAvailable
    ? (ariaLabelProp
      ? `${ariaLabelProp} (chưa có audio)`
      : lemma
        ? `Chưa có audio cho từ ${lemma}`
        : 'Chưa có audio')
    : (ariaLabelProp ?? (lemma ? `Nghe phát âm từ ${lemma}` : 'Nghe phát âm'))

  const defaultChild = (
    <Volume2
      aria-hidden="true"
      size={iconSize}
      data-playing={state === 'playing' ? 'true' : undefined}
      data-state={!isAvailable ? 'unavailable' : state}
    />
  )

  const buttonContent = children ?? defaultChild

  // Use shadcn Button if variant or size is passed, or if no className is passed (defaulting to outline icon)
  const useShadcn = variant !== undefined || size !== undefined || !className

  const buttonElement = useShadcn ? (
    <Button
      {...buttonProps}
      type="button"
      variant={variant ?? 'outline'}
      size={size ?? 'icon'}
      className={cn(
        !isAvailable && 'disabled:pointer-events-auto cursor-not-allowed opacity-50',
        className
      )}
      style={style}
      disabled={!isAvailable}
      aria-disabled={!isAvailable ? 'true' : undefined}
      aria-label={computedAriaLabel}
      title={computedTitle}
      data-state={!isAvailable ? 'unavailable' : state}
      onClick={play}
    >
      {buttonContent}
    </Button>
  ) : (
    <button
      {...buttonProps}
      type="button"
      className={className}
      style={{
        ...style,
        cursor: !isAvailable ? 'not-allowed' : style?.cursor,
        opacity: !isAvailable ? 0.45 : style?.opacity,
      }}
      disabled={!isAvailable}
      aria-disabled={!isAvailable ? 'true' : undefined}
      aria-label={computedAriaLabel}
      title={computedTitle}
      data-state={!isAvailable ? 'unavailable' : state}
      onClick={play}
    >
      {buttonContent}
    </button>
  )

  return (
    <>
      {buttonElement}
      {showErrorMessage && state === 'failed' ? (
        <span className={errorClassName ?? 'lp-vocabulary__play-error'} role="status">
          Chưa phát được âm thanh.
        </span>
      ) : null}
    </>
  )
}

