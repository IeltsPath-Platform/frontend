import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle2, KeyRound, LoaderCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AccessApiError, normalizeActivationKey } from '../accessApi'
import type { AccessClient, ActivationResult } from '../accessApi'
import type { ActivationProduct } from '../pricingData'

interface KeyActivationDialogProps {
  product: ActivationProduct | null
  isLoggedIn: boolean
  client?: AccessClient
  onClose: () => void
  onActivated: (result: ActivationResult) => void
  returnFocus: () => void
}

export function KeyActivationDialog({ product, isLoggedIn, client, onClose, onActivated, returnFocus }: KeyActivationDialogProps) {
  const [rawKey, setRawKey] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)
  const [result, setResult] = useState<ActivationResult | null>(null)
  const attempt = useRef<{ rawKey: string; id: string } | null>(null)
  const submitting = useRef(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const canActivate = isLoggedIn && !!client

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current || !client || !isLoggedIn || result) return
    const normalizedKey = normalizeActivationKey(rawKey)
    if (!normalizedKey) {
      setError('Vui lòng nhập mã kích hoạt.')
      inputRef.current?.focus()
      return
    }

    submitting.current = true
    setPending(true)
    setError('')
    try {
      if (attempt.current?.rawKey !== normalizedKey) {
        attempt.current = { rawKey: normalizedKey, id: crypto.randomUUID() }
      }
      const activated = await client.activateKey(normalizedKey, attempt.current.id)
      setResult(activated)
      setRawKey('')
      attempt.current = null
      onActivated(activated)
    } catch (cause) {
      setError(cause instanceof AccessApiError
        ? cause.message
        : 'Chưa xác nhận được kết quả kích hoạt. Hãy giữ nguyên mã và thử lại khi kết nối ổn định.')
    } finally {
      submitting.current = false
      setPending(false)
    }
  }

  function close() {
    if (submitting.current) return
    setResult(null)
    setError('')
    onClose()
  }

  return (
    <Dialog open={product !== null} onOpenChange={(open) => { if (!open) close() }}>
      <DialogContent onCloseAutoFocus={(event) => { event.preventDefault(); returnFocus() }}>
        <DialogHeader>
          <DialogTitle>Kích hoạt Gói / Nạp Key</DialogTitle>
          <DialogDescription>
            {product?.name}. Quyền lợi được cấp theo mã Key bạn nhập.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-4" role="status">
            <p className="flex items-center gap-2 font-semibold"><CheckCircle2 aria-hidden="true" /> Kích hoạt thành công</p>
            {result.productType === 'POINTS' ? (
              <p>Đã nạp {result.pointsGranted.toLocaleString('vi-VN')} Points vào ví điểm. Điểm không hết hạn và không cấp quyền Premium hay lượt chấm giáo viên.</p>
            ) : (
              <p>Đã cộng {result.premiumDaysGranted} ngày Premium và {result.humanGradingCreditsGranted} lượt chấm giáo viên. Gói không cộng thêm AI Points.</p>
            )}
            <Button type="button" className="min-h-11 w-full" onClick={close}>Hoàn tất</Button>
          </div>
        ) : (
          <form className="space-y-4" onSubmit={handleSubmit} aria-busy={pending}>
            <div className="space-y-2">
              <label htmlFor="activation-key" className="text-sm font-semibold">Mã Activation Key</label>
              <Input ref={inputRef} id="activation-key" name="activation-key" value={rawKey}
                className="min-h-11 font-mono" placeholder="IP-XXXX-XXXX-XXXX"
                autoComplete="off" autoCapitalize="characters" spellCheck={false}
                disabled={!canActivate || pending} aria-invalid={!!error}
                aria-describedby={`activation-key-help${error ? ' activation-key-error' : ''}`}
                onChange={(event) => { setRawKey(event.target.value); setError('') }} />
              <p id="activation-key-help" className="text-sm text-muted-foreground">Nhập đầy đủ mã được cấp, bao gồm tiền tố IP- nếu có. Không cần thanh toán trực tiếp tại đây.</p>
            </div>

            {!isLoggedIn ? (
              <div className="space-y-3">
                <p className="text-sm">Đăng nhập tài khoản của bạn để kích hoạt gói hoặc nạp điểm.</p>
                <Button asChild className="min-h-11 w-full"><Link to="/login">Đăng nhập</Link></Button>
              </div>
            ) : !client ? (
              <p role="status" className="text-sm text-muted-foreground">Phiên đăng nhập demo chưa hỗ trợ kích hoạt Key. Mã của bạn chưa được gửi hoặc sử dụng.</p>
            ) : (
              <Button type="submit" disabled={pending} className="min-h-11 w-full">
                {pending ? <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" /> : <KeyRound aria-hidden="true" />}
                {pending ? 'Đang kích hoạt…' : 'Kích hoạt bằng Mã Key'}
              </Button>
            )}
            {error && <p id="activation-key-error" role="alert" className="text-sm text-destructive">{error}</p>}
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
