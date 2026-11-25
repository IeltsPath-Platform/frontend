import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import type { SectionQuestionDraft } from '../../ai-drafts/types'
import type { PackageSection, PackageType } from '../types'
import { SectionAiRequestModal } from './SectionAiRequestModal'
import { SectionAiReviewModal } from './SectionAiReviewModal'

export function SectionAiButton({ packageId, versionId, section, packageType, disabled, openDraft, onSaved, onMutate }: {
  packageId: string; versionId: string; section: PackageSection; packageType: PackageType; disabled: boolean
  openDraft?: SectionQuestionDraft; onSaved: () => void
  onMutate: (action: () => Promise<unknown>, message: string) => Promise<boolean>
}) {
  const [requestOpen, setRequestOpen] = useState(false)
  const [reviewId, setReviewId] = useState<string | null>(null)
  const source = section.skill === 'LISTENING' ? section.audio?.transcript : section.skill === 'READING' ? section.passage : null
  const supported = section.skill === 'LISTENING' || section.skill === 'READING'
  const sourceMissing = !source?.trim()
  if (!supported || !['MOCK_TEST', 'PLACEMENT_TEST', 'PRACTICE_SET', 'TOPIC_TEST', 'COURSE_TEST'].includes(packageType)) return null
  const activeDraft = openDraft && ['QUEUED', 'GENERATING', 'READY'].includes(openDraft.status) ? openDraft : undefined
  const label = activeDraft?.status === 'READY'
    ? `Duyệt câu AI (${activeDraft.result?.items.length ?? 0})`
    : activeDraft?.status === 'QUEUED' || activeDraft?.status === 'GENERATING' ? 'Đang sinh…' : 'Sinh câu hỏi bằng AI'
  return <>
    <button className="adm-btn adm-btn--small" type="button" disabled={disabled || sourceMissing} title={sourceMissing ? 'Phần chưa có transcript hoặc đoạn văn.' : undefined}
      onClick={() => activeDraft ? setReviewId(activeDraft.id) : setRequestOpen(true)}>
      <Sparkles size={14} aria-hidden="true" /> {label}
    </button>
    {requestOpen ? <SectionAiRequestModal packageId={packageId} versionId={versionId} section={section} onClose={() => setRequestOpen(false)} onCreated={(id) => { setRequestOpen(false); setReviewId(id); onSaved() }} /> : null}
    {reviewId ? <SectionAiReviewModal draftId={reviewId} onClose={() => setReviewId(null)} onMutate={onMutate} onComplete={() => { setReviewId(null); onSaved() }} /> : null}
  </>
}
