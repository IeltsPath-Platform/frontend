import {
  PronunciationButton as SharedPronunciationButton,
  type PronunciationButtonProps,
} from '@/components/PronunciationButton'

export type { PronunciationButtonProps }

export function PronunciationButton(props: PronunciationButtonProps) {
  return (
    <SharedPronunciationButton
      className="lp-vocabulary__play"
      showErrorMessage
      errorClassName="lp-vocabulary__play-error"
      {...props}
    />
  )
}
