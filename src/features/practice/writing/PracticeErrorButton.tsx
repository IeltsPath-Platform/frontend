import { useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toApiError, userMessage } from '@/features/learning-path/api'
import { startStudyPointPractice } from '@/features/learning-path/lib/studyPointPractice'

/**
 * "Luyện lỗi này": starts free practice on the knowledge point an error kind maps to, and comes back to this page afterwards.
 * Renders nothing when the kind has no practice set, so a button never leads nowhere.
 */
export function PracticeErrorButton({ knowledgePointId, name, code }: {
  knowledgePointId: string | undefined
  /** What the practice screen calls the set. */
  name: string
  code?: string
}) {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inFlight = useRef(false)
  if (!knowledgePointId) return null

  async function open() {
    if (inFlight.current) return
    inFlight.current = true
    setOpening(true)
    setError(null)
    try {
      await startStudyPointPractice({
        kind: 'KNOWLEDGE_POINT', criterionCode: null, band: null, knowledgePointId: null, code: code ?? null,
        name, title: null, reason: null, practiceKnowledgePointId: knowledgePointId,
      }, `${pathname}${search}`, navigate)
    } catch (reason) {
      inFlight.current = false
      setOpening(false)
      setError(userMessage(toApiError(reason)))
    }
  }

  return (
    <span className="wr-practice">
      <button type="button" className="wr-secondary" disabled={opening} onClick={() => void open()}>
        {opening ? 'Đang mở bộ luyện…' : 'Luyện lỗi này'}
      </button>
      {error && <small role="alert" className="wr-error">{error}</small>}
    </span>
  )
}
