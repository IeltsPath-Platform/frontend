import { useState, type FormEvent } from 'react'
import { Flag } from 'lucide-react'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/components/toast/toastContext'
import { HttpError } from '@/lib/httpClient'
import { requiredText } from '@/lib/validation/fields'
import { collectErrors } from '@/lib/validation/useFormErrors'
import { AI_GRADING_REPORT_REASON_MAX, aiGradingReportApi, type AiGradingSubmissionType } from './aiGradingReportApi'

const reasonSchema = z.object({ reason: requiredText('Lý do báo cáo', AI_GRADING_REPORT_REASON_MAX) })

interface ReportAiGradingButtonProps {
  submissionId: string
  submissionType: AiGradingSubmissionType
}

/**
 * Lets a learner flag an AI grade they believe is wrong. Examiners read these reports; the grade itself does not
 * change until someone reviews it.
 */
export function ReportAiGradingButton({ submissionId, submissionType }: ReportAiGradingButtonProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [tried, setTried] = useState(false)
  const [busy, setBusy] = useState(false)
  const [serverError, setServerError] = useState('')
  const [reported, setReported] = useState(false)
  const reasonError = tried ? collectErrors(reasonSchema, { reason }).reason : undefined

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (Object.keys(collectErrors(reasonSchema, { reason })).length > 0) {
      setTried(true)
      return
    }
    setBusy(true)
    setServerError('')
    try {
      await aiGradingReportApi.submit({ submissionId, submissionType, reason: reason.trim() })
      setReported(true)
      setOpen(false)
      toast({ title: 'Đã gửi báo cáo', description: 'Giám khảo sẽ xem lại kết quả chấm của bài này.', tone: 'success' })
    } catch (error) {
      setServerError(error instanceof HttpError ? error.message : 'Không thể gửi báo cáo. Vui lòng thử lại.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" disabled={reported} onClick={() => setOpen(true)}>
        <Flag size={14} aria-hidden="true" />
        {reported ? 'Đã báo cáo kết quả chấm' : 'Báo cáo kết quả chấm sai'}
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Báo cáo kết quả chấm AI</DialogTitle>
            <DialogDescription>
              Cho chúng tôi biết điểm hoặc nhận xét nào chưa đúng. Mỗi bài chỉ báo cáo được một lần.
            </DialogDescription>
          </DialogHeader>
          <form noValidate onSubmit={handleSubmit} className="flex flex-col gap-2">
            <label htmlFor="ai-grading-report-reason" className="text-sm font-semibold after:ml-1 after:text-red-600 after:content-['*']">
              Lý do
            </label>
            <Textarea
              id="ai-grading-report-reason"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={AI_GRADING_REPORT_REASON_MAX}
              rows={5}
              aria-required
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={reasonError ? 'ai-grading-report-reason-error' : undefined}
              placeholder="Ví dụ: Band Coherence quá thấp so với bài viết, nhận xét về ngữ pháp không đúng với câu đã viết…"
              disabled={busy}
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span id="ai-grading-report-reason-error" role={reasonError ? 'alert' : undefined} className="text-red-600">{reasonError}</span>
              <span>{reason.trim().length}/{AI_GRADING_REPORT_REASON_MAX}</span>
            </div>
            {serverError && <p role="alert" className="text-sm text-red-600">{serverError}</p>}
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={busy}>Hủy</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Đang gửi…' : 'Gửi báo cáo'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
