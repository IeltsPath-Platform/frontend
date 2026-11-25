import { useCallback, useEffect, useRef, useState } from 'react'
import { AdminModal } from '../../components/AdminLayer'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { aiDraftError } from '../../ai-drafts/lib/aiDraftLabels'
import { aiDraftFailure } from '../../ai-drafts/lib/aiDraftLabels'
import { DraftReview } from '../../ai-drafts/components/DraftReview'
import {
  approveSectionQuestionDraft, editSectionQuestionDraftItem, getSectionQuestionDraft,
  rejectSectionQuestionDraft, removeSectionQuestionDraftItem,
} from '../api/sectionDraftApi'
import type { SectionQuestionDetail } from '../../ai-drafts/types'

export function SectionAiReviewModal({ draftId, onClose, onComplete, onMutate }: {
  draftId: string; onClose: () => void; onComplete: () => void
  onMutate: (action: () => Promise<unknown>, message: string) => Promise<boolean>
}) {
  const [draft, setDraft] = useState<SectionQuestionDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const pollErrors = useRef(0)
  const { confirm, confirmDialog } = useAdminConfirm()
  const reload = useCallback(async () => {
    try { setDraft(await getSectionQuestionDraft(draftId)); pollErrors.current = 0; setError(null) }
    catch (reason) { pollErrors.current += 1; if (pollErrors.current >= 3) setError(aiDraftError(reason)) }
  }, [draftId])
  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])
  useEffect(() => {
    if (!draft || !['QUEUED', 'GENERATING'].includes(draft.status)) return
    const timer = window.setInterval(() => void reload(), 5000)
    return () => window.clearInterval(timer)
  }, [draft, reload])
  async function run(action: () => Promise<unknown>, message: string, done = false): Promise<boolean> {
    setBusy(true); setError(null)
    try {
      if (await onMutate(action, message)) { if (done) { onComplete(); return true }; await reload(); return true }
      await reload(); return false
    }
    catch (reason) { setError(aiDraftError(reason)); await reload(); return false }
    finally { setBusy(false) }
  }
  return <AdminModal onClose={onClose} size="wide" stacked top title="Duyệt câu hỏi AI">
    {() => <div className="adm-section-ai-review-modal">
      {confirmDialog}
      {!draft ? <p role="status">Đang tải bản nháp…</p> : draft.status === 'QUEUED' || draft.status === 'GENERATING' ? <p role="status">Đang sinh câu hỏi…</p> : draft.status === 'FAILED' ? <p className="adm-alert adm-alert--error">{draft.errorCode ? aiDraftFailure(draft.errorCode) : 'Không tạo được câu hỏi.'}</p> : draft.status === 'EXPIRED' ? <p className="adm-alert">Lượt này đã hết hạn.</p> : <DraftReview draft={draft} busy={busy} onEdit={(itemId, body) => run(() => editSectionQuestionDraftItem(draftId, itemId, { ...body, revision: draft.result?.revision ?? 0 }), 'Đã lưu câu hỏi nháp.')} onRemove={(itemId) => run(() => removeSectionQuestionDraftItem(draftId, itemId, draft.result?.revision ?? 0), 'Đã bỏ câu hỏi khỏi lượt nháp.')} onApprove={async (ids, accept) => { await run(() => approveSectionQuestionDraft(draftId, ids, draft.result?.revision ?? 0, accept), `Đã thêm ${ids.length} câu vào phần.`, true) }} onReject={async () => {
        if (await confirm({ title: 'Từ chối lượt này?', message: 'Các câu trong lượt này sẽ không được thêm vào phần.', confirmLabel: 'Từ chối', tone: 'danger' })) await run(() => rejectSectionQuestionDraft(draftId), 'Đã từ chối lượt tạo câu hỏi.', true)
      }} />}
      {error ? <p className="adm-alert adm-alert--error" role="alert">{error}</p> : null}
      {draft && !['QUEUED', 'GENERATING', 'READY'].includes(draft.status) ? <button className="adm-btn" type="button" disabled={busy} onClick={onClose}>Đóng</button> : null}
    </div>}
  </AdminModal>
}
