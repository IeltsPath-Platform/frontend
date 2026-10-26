import { useEffect, useState } from 'react'
import { BookOpenText, Info, RotateCcw, Bookmark, BookmarkCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getLessonVocabularySenses } from '../api/lessonVocabularyApi'
import { notebookApi } from '@/features/vocabulary/api/notebookApi'
import { useApiResource } from '../lib/useApiResource'
import { LoadingState } from './PageState'
import { PronunciationButton } from './PronunciationButton'
import '../lesson-vocabulary.css'

interface LessonVocabularyProps {
  senseIds: readonly string[]
}

const PART_OF_SPEECH_LABELS: Record<string, string> = {
  NOUN: 'Danh từ',
  VERB: 'Động từ',
  ADJECTIVE: 'Tính từ',
  ADVERB: 'Trạng từ',
  PREPOSITION: 'Giới từ',
  CONJUNCTION: 'Liên từ',
  IDIOM: 'Thành ngữ',
  PHRASAL_VERB: 'Cụm động từ',
}

// Library returns the stored reference as is; only a full https URL can be played from the browser.
function hasPlayableAudio(reference: string | null): reference is string {
  return reference !== null && reference.startsWith('https://')
}

export function LessonVocabulary({ senseIds }: LessonVocabularyProps) {
  if (senseIds.length === 0) {
    return (
      <div className="lp-vocabulary__empty" role="status">
        <BookOpenText aria-hidden="true" size={28} />
        <p>Bài học này chưa có từ vựng.</p>
        <p className="lp-vocabulary__muted">Bạn có thể tiếp tục xem các nội dung khác của bài học.</p>
      </div>
    )
  }

  return <VocabularyList senseIds={senseIds} />
}

function VocabularyList({ senseIds }: LessonVocabularyProps) {
  const resource = useApiResource(`lesson-vocabulary:${senseIds.join(',')}`, () => getLessonVocabularySenses(senseIds))
  const [savedSenseIds, setSavedSenseIds] = useState<Set<string>>(new Set())
  const [savingSenseId, setSavingSenseId] = useState<string | null>(null)

  useEffect(() => {
    if (senseIds.length === 0) return
    let active = true
    notebookApi.getSavedNotebookSenses([...senseIds])
      .then((saved) => {
        if (active) setSavedSenseIds(new Set(saved))
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [senseIds])

  const handleToggleSave = async (senseId: string) => {
    if (savedSenseIds.has(senseId) || savingSenseId === senseId) return
    setSavingSenseId(senseId)
    try {
      await notebookApi.saveNotebookEntry(senseId)
      setSavedSenseIds((prev) => new Set([...prev, senseId]))
    } catch {
      // Silent error fallback
    } finally {
      setSavingSenseId(null)
    }
  }

  if (resource.status === 'loading') return <LoadingState label="Đang tải từ vựng…" />

  if (resource.status === 'error') {
    return (
      <div className="lp-vocabulary__feedback" role="alert">
        <p>Chưa tải được từ vựng. Hãy thử lại.</p>
        <Button className="lp-btn lp-vocabulary__retry" type="button" onClick={resource.reload}>
          <RotateCcw aria-hidden="true" size={16} />
          Thử lại
        </Button>
      </div>
    )
  }

  const senses = resource.data ?? []
  const unavailableCount = new Set(senseIds).size - senses.length

  if (senses.length === 0) {
    return (
      <div className="lp-vocabulary__empty" role="status">
        <BookOpenText aria-hidden="true" size={28} />
        <p>Từ vựng của bài học hiện chưa khả dụng.</p>
        <p className="lp-vocabulary__muted">Bạn có thể tiếp tục học và quay lại sau.</p>
      </div>
    )
  }

  return (
    <div className="lp-vocabulary">
      <p className="lp-vocabulary__intro">{senses.length} mục từ · Xem nghĩa và cách dùng trong ngữ cảnh.</p>

      {unavailableCount > 0 ? (
        <p className="lp-vocabulary__notice" role="status">
          <Info aria-hidden="true" size={17} />
          <span>Một số từ vựng hiện chưa khả dụng. Bạn vẫn có thể xem các mục từ bên dưới.</span>
        </p>
      ) : null}

      <ol className="lp-vocabulary__list" role="list">
        {senses.map((sense, index) => (
          <li className="lp-vocabulary__item" key={sense.senseId}>
            <span className="lp-vocabulary__number" aria-hidden="true">{index + 1}</span>
            <div className="lp-vocabulary__body">
              <div className="lp-vocabulary__heading" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
                <h3 lang="en">{sense.lemma}</h3>
                {sense.partOfSpeech ? <span className="lp-vocabulary__pos">{PART_OF_SPEECH_LABELS[sense.partOfSpeech] ?? sense.partOfSpeech.toLowerCase().replaceAll('_', ' ')}</span> : null}
                <button
                  type="button"
                  onClick={() => handleToggleSave(sense.senseId)}
                  disabled={savingSenseId === sense.senseId}
                  title={savedSenseIds.has(sense.senseId) ? 'Đã lưu trong sổ tay' : 'Lưu vào sổ tay'}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    padding: '0.3rem 0.65rem',
                    borderRadius: '0.5rem',
                    border: '1px solid',
                    borderColor: savedSenseIds.has(sense.senseId) ? '#16a34a' : '#cbd5e1',
                    background: savedSenseIds.has(sense.senseId) ? '#f0fdf4' : '#ffffff',
                    color: savedSenseIds.has(sense.senseId) ? '#15803d' : '#475569',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: savedSenseIds.has(sense.senseId) ? 'default' : 'pointer',
                  }}
                >
                  {savedSenseIds.has(sense.senseId) ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                  <span>{savedSenseIds.has(sense.senseId) ? 'Đã lưu' : 'Lưu vào sổ'}</span>
                </button>
              </div>
              {sense.ipa || hasPlayableAudio(sense.pronunciationAudioReference) ? (
                <div className="lp-vocabulary__pronunciation">
                  {hasPlayableAudio(sense.pronunciationAudioReference) ? (
                    <PronunciationButton lemma={sense.lemma} src={sense.pronunciationAudioReference} />
                  ) : null}
                  {sense.ipa ? <p className="lp-vocabulary__ipa">{sense.ipa}</p> : null}
                </div>
              ) : null}
              {sense.vietnameseMeaning ? <p className="lp-vocabulary__meaning">{sense.vietnameseMeaning}</p> : null}
              {sense.englishDefinition ? <p className="lp-vocabulary__definition" lang="en">{sense.englishDefinition}</p> : null}
              {!sense.vietnameseMeaning && !sense.englishDefinition ? (
                <p className="lp-vocabulary__muted">Chưa có nghĩa cho mục từ này.</p>
              ) : null}
              {sense.exampleSentence ? (
                <div className="lp-vocabulary__example">
                  <p className="lp-vocabulary__example-label">Ví dụ</p>
                  <p lang="en">{sense.exampleSentence}</p>
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
