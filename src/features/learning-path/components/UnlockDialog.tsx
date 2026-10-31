import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { KeyActivationDialog } from '@/features/home/components/KeyActivationDialog'
import { POINT_PRODUCTS } from '@/features/home/pricingData'
import { useWritingWallet } from '@/features/practice/writing/useWritingWallet'
import type { CourseUnlockTarget } from '~types/learningPath'
import { learningApi, toApiError } from '../api'
import { useApiResource } from '../lib/useApiResource'

const LABEL: Record<CourseUnlockTarget, string> = { LISTENING: 'Nghe', READING: 'Đọc', WRITING: 'Viết', SPEAKING: 'Nói', COMBO: 'gói kết hợp' }

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
  const price = !course ? undefined : target === 'COMBO' ? course.comboPayablePoints : course.skillUnlockPoints?.[target]
  const unlocked = !course ? false : target === 'COMBO' ? course.comboUnlocked : course.unlockedSkills?.includes(target)

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
        const nowUnlocked = target === 'COMBO' ? fresh?.comboUnlocked : fresh?.unlockedSkills?.includes(target)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mở khóa {LABEL[target]}</DialogTitle>
          <DialogDescription>{course?.title ?? 'Khóa học'}. Giá do máy chủ cung cấp; Premium cũng mở quyền truy cập trong thời hạn gói.</DialogDescription>
        </DialogHeader>
        {!course ? <p role="status">{courses.status === 'loading' ? 'Đang tải giá…' : 'Chưa tải được thông tin khóa học.'}</p> : unlocked ? <p role="status">Kỹ năng này đã được mở khóa.</p> : price == null ? <p role="status">Kỹ năng này sắp ra mắt hoặc hiện chưa được mở bán.</p> : <>
          <p>Giá: <strong>{price.toLocaleString('vi-VN')} Points</strong></p>
          <p>Số dư: {wallet.balance === null ? 'Chưa tải được' : `${wallet.balance.toLocaleString('vi-VN')} Points`}</p>
          {wallet.balance !== null && wallet.balance < price ? <p role="status">Còn thiếu {(price - wallet.balance).toLocaleString('vi-VN')} Points.</p> : null}
          <div className="flex flex-wrap gap-2"><Button disabled={busy || wallet.balance === null || wallet.balance < price} onClick={() => void purchase()} type="button">{busy ? 'Đang xử lý…' : 'Mở khóa bằng Points'}</Button><Button variant="outline" onClick={() => setTopUp(true)} type="button">Nạp Points</Button></div>
        </>}
        {message ? <p role="status">{message}</p> : null}
      </DialogContent>
    </Dialog>
    <KeyActivationDialog product={topUp ? POINT_PRODUCTS[0] : null} isLoggedIn={wallet.isLoggedIn} client={wallet.client} onClose={() => setTopUp(false)} onActivated={(result) => { wallet.onActivated(result); courses.reload(); onChanged() }} returnFocus={() => undefined} />
  </>
}
