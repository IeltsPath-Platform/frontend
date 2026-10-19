import { useEffect, useRef } from 'react'
import { useToast } from '@/components/toast/toastContext'
import type { GamificationSummary } from '~types/learningPath'

/**
 * What a submission earned and cost, announced as toasts: one each for a new level, the XP, the daily XP cap and the
 * hearts lost. Renders nothing itself. A submission that changed none of these, such as a review with no correct first
 * answer, shows nothing.
 */
export function RewardSummary({ gamification }: { gamification: GamificationSummary | null }) {
  const { toast } = useToast()
  // Strict Mode runs effects twice on the same render; the ref keeps one submission from announcing itself twice.
  const announced = useRef<GamificationSummary | null>(null)

  useEffect(() => {
    if (!gamification || announced.current === gamification) return
    announced.current = gamification
    const { xpEarned, xpCapped, totalXp, level, leveledUp, heartsLost, heartsRemaining } = gamification

    if (leveledUp) {
      toast({ title: `Lên cấp ${level}!`, description: 'Tim đã được hồi đầy.', tone: 'success' })
    }
    if (xpEarned > 0) {
      toast({ title: `+${xpEarned} XP`, description: `Cấp ${level} · ${totalXp} XP`, tone: 'success' })
    }
    if (xpCapped) {
      toast({
        title: 'Đã chạm trần XP hôm nay',
        description: 'Phần vượt không được tính. Mai lại tính tiếp.',
        tone: 'info',
      })
    }
    if ((heartsLost ?? 0) > 0) {
      toast({
        title: `Mất ${heartsLost} tim`,
        description: heartsRemaining === 0
          ? 'Bạn đã hết tim.'
          : heartsRemaining !== null ? `Còn ${heartsRemaining} tim.` : undefined,
        tone: 'error',
      })
    }
  }, [gamification, toast])

  return null
}
