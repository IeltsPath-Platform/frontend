import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KeyActivationDialog } from '@/features/home/components/KeyActivationDialog'
import { POINT_PRODUCTS } from '@/features/home/pricingData'
import { useWritingWallet } from '@/features/practice/writing/useWritingWallet'
import type { CourseUnlockTarget } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { skillLabel } from '../lib/courseMeta'
import { SKILL_ICON } from '../lib/skillVisuals'
import { useApiResource } from '../lib/useApiResource'

function points(value: number) {
  return `${value.toLocaleString('vi-VN')} Points`
}

/** Buys one skill of a course, or all of them as the combo, with Points. The server owns the price and the debit. */
export function UnlockDialog({ courseId, target, onClose, onChanged }: {
  courseId: string
  target: CourseUnlockTarget
  onClose: () => void
  onChanged: () => void
}) {
  const wallet = useWritingWallet()
  const { check: checkWallet } = wallet
  const courses = useApiResource('courses', () => learningApi.listCourses())
  const course = courses.data?.find((row) => row.id === courseId)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [topUp, setTopUp] = useState(false)
  const requestKey = useRef<string | null>(null)
  const inFlight = useRef(false)
  const combo = target === 'COMBO'
  const price = !course ? undefined : combo ? course.comboPayablePoints : course.skillUnlockPoints?.[target]
  const unlocked = !course ? false : combo ? course.comboUnlocked : course.unlockedSkills?.includes(target)
  const balance = wallet.balance
  const enough = price != null && balance !== null && balance >= price
  // The combo's list price minus what the learner already paid for single skills of this course.
  const credit = combo && price != null && course?.comboUnlockPoints != null && course.comboUnlockPoints > price
    ? course.comboUnlockPoints - price
    : 0
  const name = combo ? 'cả 4 kỹ năng' : skillLabel(target) ?? target
  const Icon = combo ? Layers : SKILL_ICON[target]

  useEffect(() => { void checkWallet() }, [checkWallet])

  async function purchase() {
    if (!course || inFlight.current || price == null || unlocked) return
    inFlight.current = true
    setBusy(true)
    setMessage('')
    requestKey.current ??= crypto.randomUUID()
    try {
      await learningApi.unlockCourse(course.id, target, requestKey.current)
      requestKey.current = null
      courses.reload()
      onChanged()
      onClose()
    } catch (reason) {
      const error = toApiError(reason)
      if (error.code === 'ALREADY_UNLOCKED') {
        requestKey.current = null
        courses.reload()
        onChanged()
        onClose()
      } else if (error.code === 'INSUFFICIENT_POINTS') {
        requestKey.current = null
        setMessage(`Bạn còn thiếu ${Math.max(0, price - (wallet.balance ?? 0))} Points.`)
      } else if (error.status === 0 || error.status === 503 || error.code === 'ACCESS_UNAVAILABLE' || error.code === 'SERVER_ERROR') {
        onChanged()
        const rows = await learningApi.listCourses().catch(() => null)
        const fresh = rows?.find((row) => row.id === course.id)
        const nowUnlocked = combo ? fresh?.comboUnlocked : fresh?.unlockedSkills?.includes(target)
        setMessage(nowUnlocked ? 'Đã xác nhận mở khóa.' : 'Đang xác nhận giao dịch. Tải lại trạng thái hoặc thử lại sau giây lát; yêu cầu sẽ được đối soát an toàn.')
        if (nowUnlocked) { requestKey.current = null; courses.reload() }
      } else {
        requestKey.current = null
        setMessage(error.message)
      }
    } finally { inFlight.current = false; setBusy(false); void wallet.check() }
  }

  return <>
    <Dialog open onOpenChange={(open) => { if (!open && !busy) onClose() }}>
      <DialogContent
        className="lp-tokens lp-unlock"
        style={{ '--hue': combo ? 'var(--lp-primary)' : `var(--lp-hue-${target.toLowerCase()})` } as CSSProperties}
      >
        <DialogHeader className="lp-unlock__head">
          <span className="lp-unlock__icon" aria-hidden="true"><Icon size={24} strokeWidth={2.1} /></span>
          <div className="lp-unlock__heading">
            <p className="lp-unlock__eyebrow">
              {course ? `${course.title} · Band ${course.bandLevel.toFixed(1)}` : 'Khóa học'}
            </p>
            <DialogTitle className="lp-unlock__title">Mở khóa {name}</DialogTitle>
          </div>
          <DialogDescription className="lp-unlock__benefit">
            {combo
              ? 'Mở vĩnh viễn cả 4 kỹ năng của khóa, kể cả kỹ năng ra mắt sau.'
              : `Mở vĩnh viễn mọi chặng ${name} của khóa.`}
          </DialogDescription>
        </DialogHeader>

        {!course ? (
          <p className="lp-unlock__state" role="status">{courses.status === 'loading' ? 'Đang tải giá…' : 'Chưa tải được thông tin khóa học.'}</p>
        ) : unlocked ? (
          <p className="lp-unlock__state" role="status">Kỹ năng này đã được mở khóa.</p>
        ) : price == null ? (
          <p className="lp-unlock__state" role="status">Kỹ năng này sắp ra mắt hoặc hiện chưa được mở bán.</p>
        ) : (
          <>
            <dl className="lp-unlock__ledger">
              <div className="lp-unlock__row lp-unlock__row--price">
                <dt>Giá</dt>
                <dd><strong>{points(price)}</strong></dd>
              </div>
              {credit > 0 ? (
                <div className="lp-unlock__row lp-unlock__row--credit">
                  <dt>Đã trừ kỹ năng bạn đã mở</dt>
                  <dd>−{points(credit)}</dd>
                </div>
              ) : null}
              <div className="lp-unlock__row">
                <dt>Số dư</dt>
                <dd>{balance === null ? 'Chưa tải được' : points(balance)}</dd>
              </div>
              {balance !== null ? (
                enough ? (
                  <div className="lp-unlock__row lp-unlock__row--after">
                    <dt>Sau khi mở</dt>
                    <dd>{points(balance - price)}</dd>
                  </div>
                ) : (
                  <div className="lp-unlock__row lp-unlock__row--short">
                    <dt>Còn thiếu</dt>
                    <dd>{points(price - balance)}</dd>
                  </div>
                )
              ) : null}
            </dl>

            <div className="lp-unlock__actions">
              <Button
                className="lp-btn lp-btn--accent lp-btn--cta lp-unlock__buy"
                disabled={busy || !enough}
                onClick={() => void purchase()}
                type="button"
              >
                {busy ? 'Đang xử lý…' : 'Mở khóa bằng Points'}
              </Button>
              <button
                className={`lp-unlock__topup${enough ? '' : ' is-needed'}`}
                onClick={() => setTopUp(true)}
                type="button"
              >
                Nạp Points
              </button>
            </div>
            <p className="lp-unlock__note">Gói Premium cũng mở mọi kỹ năng trong thời hạn gói.</p>
          </>
        )}
        {message ? <p className="lp-unlock__message" role="status">{message}</p> : null}
      </DialogContent>
    </Dialog>
    <KeyActivationDialog product={topUp ? POINT_PRODUCTS[0] : null} isLoggedIn={wallet.isLoggedIn} client={wallet.client} onClose={() => setTopUp(false)} onActivated={(result) => { wallet.onActivated(result); courses.reload(); onChanged() }} returnFocus={() => undefined} />
  </>
}
