import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { getLessonVocabularySenses } from '@/features/learning-path/api/lessonVocabularyApi'
import { AdminModal } from '../../components/AdminLayer'
import { AdminRowMenu } from '../../components/AdminRowMenu'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { useAdminConfirm } from '../../lib/useAdminConfirm'
import { useAdminErrorToast } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import { addBlock, updateBlock } from '../api/lessonApi'
import { MAX_SENSES_PER_BLOCK } from '../lib/blockForm'
import { lessonErrorText } from '../lib/lessonErrors'
import type { LessonBlock } from '../types'
import { VocabularySensePicker } from './VocabularySensePicker'

const MISSING_SENSE = 'Nghĩa không còn khả dụng'

/** The popup that adds words: the picker, with the Đóng and Lưu of a form. Nothing is sent until Lưu. */
function AddSensesForm({ initial, busy, onSave, onClose }: {
  initial: readonly string[]
  busy: boolean
  onSave: (ids: string[]) => Promise<boolean>
  onClose: () => void
}) {
  const [draft, setDraft] = useState<string[]>([...initial])
  const fail = useAdminErrorToast()

  async function save() {
    if (draft.length === 0) {
      fail('Block từ vựng cần ít nhất một nghĩa.')
      return
    }
    if (draft.length > MAX_SENSES_PER_BLOCK) {
      fail(`Một block có tối đa ${MAX_SENSES_PER_BLOCK} nghĩa từ vựng.`)
      return
    }
    const unchanged = draft.length === initial.length && draft.every((id, index) => id === initial[index])
    if (unchanged || (await onSave(draft))) onClose()
  }

  return (
    <div className="ls-vocab-form">
      <VocabularySensePicker onChange={setDraft} value={draft} />
      <div className="adm-form-footer">
        <button className="adm-btn" onClick={onClose} type="button">Đóng</button>
        <button aria-label="Lưu từ vựng" className="adm-btn adm-btn--primary" disabled={busy} onClick={() => void save()} type="button">
          {busy ? 'Đang lưu…' : 'Lưu'}
        </button>
      </div>
    </div>
  )
}

/**
 * The words of a vocabulary block as a table, like the slides and documents of a lesson: one row per sense, with its
 * actions in the "…" menu. Adding and removing save the block at once, as the documents do.
 */
export function VocabularyBlockTable({ lessonId, block, number, onChanged }: {
  lessonId: string
  block?: LessonBlock
  /** The block's position in the lesson, for the names read by assistive tech. */
  number?: number
  onChanged: () => void
}) {
  const ids = block?.vocabularySenseIds ?? []
  const cards = useAdminResource(`block-vocabulary|${block?.id ?? `new-${lessonId}`}|${ids.join(',')}`, (signal) => getLessonVocabularySenses(ids, signal))
  const { confirm, confirmDialog } = useAdminConfirm()
  const fail = useAdminErrorToast()
  const [saving, setSaving] = useState(false)
  const [adding, setAdding] = useState(false)
  const byId = new Map((cards.data ?? []).map((card) => [card.senseId, card]))

  async function saveSenses(next: string[]): Promise<boolean> {
    setSaving(true)
    try {
      if (block) await updateBlock(lessonId, block.id, { blockType: 'VOCABULARY', vocabularySenseIds: next })
      else await addBlock(lessonId, { blockType: 'VOCABULARY', vocabularySenseIds: next })
      onChanged()
      return true
    } catch (reason) {
      fail(lessonErrorText(reason))
      return false
    } finally {
      setSaving(false)
    }
  }

  async function remove(id: string) {
    const word = byId.get(id)?.lemma ?? MISSING_SENSE
    if (!(await confirm({
      title: 'Bỏ từ này khỏi block?',
      message: `Bỏ “${word}” khỏi block từ vựng này? Học viên sẽ không còn thấy nghĩa này trong block.`,
      confirmLabel: 'Bỏ',
      tone: 'danger',
    }))) return
    await saveSenses(ids.filter((item) => item !== id))
  }

  return (
    <section aria-label={block ? `Từ vựng của block ${number}` : 'Từ vựng của bài học'} className="adm-sec">
      <div className="adm-sec__head">
        <h4 className="adm-sec__title">Từ vựng<span className="adm-count">{ids.length}</span></h4>
        <button className="adm-btn adm-btn--small" disabled={saving || ids.length >= MAX_SENSES_PER_BLOCK} onClick={() => setAdding(true)} type="button">
          <Plus aria-hidden="true" size={14} />Thêm từ vựng
        </button>
      </div>
      {cards.status === 'error' ? <AdminError message={cards.error ?? 'Không tải được từ vựng.'} onRetry={cards.reload} /> : null}
      {cards.status === 'loading' && !cards.data && ids.length > 0 ? <AdminLoading label="Đang tải từ vựng…" /> : (
        <div className="adm-table-wrap adm-kp-table">
          <table aria-label="Từ vựng" className="adm-table">
            <thead>
              <tr>
                <th className="adm-stt" scope="col">STT</th>
                <th scope="col">Từ</th>
                <th scope="col">Loại từ</th>
                <th scope="col">Nghĩa tiếng Việt</th>
                <th className="adm-col-actions" scope="col">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {ids.length === 0 ? <tr><td className="adm-muted adm-kp-table__empty" colSpan={5}>Chưa có từ nào.</td></tr> : ids.map((id, index) => {
                const card = byId.get(id)
                return (
                  <tr key={id}>
                    <td className="adm-stt">{index + 1}</td>
                    <td>{card?.lemma ?? MISSING_SENSE}{card?.ipa ? <span className="adm-muted"> {card.ipa}</span> : null}</td>
                    <td>{card?.partOfSpeech ?? '—'}</td>
                    <td>{card?.vietnameseMeaning ?? card?.englishDefinition ?? '—'}</td>
                    <td className="adm-col-actions">
                      <AdminRowMenu disabled={saving} label={`Hành động của từ ${index + 1}`} items={[
                        {
                          key: 'remove',
                          label: 'Bỏ khỏi block',
                          icon: <Trash2 aria-hidden="true" size={16} />,
                          tone: 'danger',
                          // A block keeps at least one word, so the last one cannot be removed.
                          disabled: ids.length <= 1,
                          onSelect: () => void remove(id),
                        },
                      ]} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {confirmDialog}
      {adding ? (
        <AdminModal description={block ? `Block ${number}` : 'Từ vựng của bài học'} onClose={() => setAdding(false)} size="lg" stacked title="Thêm từ vựng">
          {(close) => <AddSensesForm busy={saving} initial={ids} onClose={close} onSave={saveSenses} />}
        </AdminModal>
      ) : null}
    </section>
  )
}
