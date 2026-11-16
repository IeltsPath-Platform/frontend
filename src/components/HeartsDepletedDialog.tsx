import { useEffect, useState } from 'react'
import { Heart, Loader2 } from 'lucide-react'
import wait from '@/assets/owl/owl-wait.png'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useAuthSession } from '@/features/auth/authSession'
import { learningApi } from '@/features/learning-path/api'
import { formatWait } from '@/features/learning-path/lib/formatWait'
import { useHeartsRefill } from '@/features/learning-path/lib/useHeartsRefill'
import type { HeartsStatus } from '~types/learningPath'
import { publishHeartsChanged, subscribeHeartsDepleted } from './owl-events'

/**
 * The owl's popup for a learner with no hearts left: it says so, when the next heart returns, and sells a full refill
 * for points. It opens when a submission takes the last heart or when something that needs a heart is refused, so the
 * pages themselves stay free of notices. Hearts that turn out to be there already close it without a word.
 */
export function HeartsDepletedDialog() {
  const { isLoggedIn } = useAuthSession()
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<HeartsStatus | null>(null)
  const [loadedAt, setLoadedAt] = useState(0)

  useEffect(() => {
    if (!isLoggedIn) return undefined
    return subscribeHeartsDepleted(() => setOpen(true))
  }, [isLoggedIn])

  // Read the hearts fresh each time the popup opens: what the page knew may be minutes old.
  useEffect(() => {
    if (!open) return undefined
    let active = true
    learningApi.getHearts().then(
      (next) => {
        if (!active) return
        if (next.hearts > 0) {
          setOpen(false)
          publishHeartsChanged()
          return
        }
        setStatus(next)
        setLoadedAt(Date.now())
      },
      // The popup still works without the numbers: the refill needs no amount from here.
      () => { if (active) setStatus(null) },
    )
    return () => { active = false }
  }, [open])

  const { refilling, error, refill } = useHeartsRefill({
    refillCost: status?.refillCost ?? null,
    onRefilled: () => { setOpen(false); publishHeartsChanged() },
  })

  const waitMs = status?.nextHeartAt ? new Date(status.nextHeartAt).getTime() - loadedAt : null

  return (
    <Dialog onOpenChange={setOpen} open={open && isLoggedIn}>
      <DialogContent className="max-w-sm text-center">
        <img alt="" className="mx-auto h-28 w-auto" draggable={false} src={wait} />
        <DialogHeader className="items-center pr-0">
          <DialogTitle>Bạn đã hết tim rồi</DialogTitle>
          <DialogDescription>
            Mỗi câu sai tốn một tim.
            {waitMs !== null && waitMs > 0 ? ` Tim kế tiếp sẽ về sau ${formatWait(waitMs)}.` : ' Tim sẽ hồi dần theo thời gian.'}
            {' '}Bài ôn vẫn làm được.
          </DialogDescription>
        </DialogHeader>
        {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
        <div className="grid gap-2">
          <Button className="min-h-11" disabled={refilling} onClick={() => void refill()} type="button">
            {refilling ? <Loader2 aria-hidden="true" className="animate-spin" /> : <Heart aria-hidden="true" />}
            {status ? `Mua tim · ${status.refillCost} điểm` : 'Mua tim'}
          </Button>
          <DialogClose asChild>
            <Button className="min-h-11" type="button" variant="ghost">Để sau</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  )
}
