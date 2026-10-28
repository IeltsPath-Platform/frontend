import { useState, type FormEvent } from 'react'
import { questionDraftItemPatchSchema, type QuestionDraftItem, type QuestionDraftItemPatch } from '../types'
import { useAdminError } from '../../lib/useAdminError'

export function QuestionDraftItemEditor({ item, index, disabled, onSave, onCancel }: {
  item: QuestionDraftItem; index: number; disabled: boolean
  onSave: (body: QuestionDraftItemPatch) => Promise<boolean>; onCancel: () => void
}) {
  const [stem, setStem] = useState(item.stem)
  const [explanation, setExplanation] = useState(item.explanation)
  const [options, setOptions] = useState(() => [...item.options].sort((a, b) => a.sortOrder - b.sortOrder).map((option) => ({
    optionKey: option.optionKey, content: option.content,
    errorCode: item.answerSpec.type === 'CHOICE' ? item.answerSpec.distractors?.[option.optionKey] ?? '' : '',
  })))
  const [correct, setCorrect] = useState(item.answerSpec.type === 'CHOICE' ? item.answerSpec.correct : '')
  const [accepted, setAccepted] = useState(item.answerSpec.type === 'FILL' ? item.answerSpec.accepted.join('\n') : '')
  const [, setError] = useAdminError()
  const choice = item.answerSpec.type === 'CHOICE'

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (disabled) return
    setError(null)
    if (!stem.trim() || !explanation.trim()) { setError('Nhập nội dung câu hỏi và giải thích.'); return }
    if (choice && (options.length < 2 || options.some((option) => !option.optionKey.trim() || !option.content.trim()) || new Set(options.map((option) => option.optionKey)).size !== options.length || !options.some((option) => option.optionKey === correct))) {
      setError('Cần 2–6 lựa chọn có mã riêng, nội dung và một đáp án đúng.'); return
    }
    const answers = accepted.split('\n').map((answer) => answer.trim()).filter(Boolean)
    if (!choice && !answers.length) { setError('Nhập ít nhất một đáp án được chấp nhận.'); return }
    const body = choice ? {
      stem, explanation, options: options.map(({ optionKey, content }) => ({ optionKey, content })), correct,
      distractors: Object.fromEntries(options.filter((option) => option.optionKey !== correct && option.errorCode.trim()).map((option) => [option.optionKey, option.errorCode.trim()])),
    } : { stem, explanation, accepted: answers }
    const parsed = questionDraftItemPatchSchema.safeParse(body)
    if (!parsed.success) { setError('Nội dung vượt giới hạn cho phép. Kiểm tra câu hỏi, lựa chọn và đáp án.'); return }
    await onSave(parsed.data)
  }

  return <form className="adm-card" aria-label={`Sửa câu ${index + 1}`} noValidate onSubmit={(event) => void submit(event)}>
    <h3>Sửa câu {index + 1}</h3>
    <fieldset className="adm-draft-fields" disabled={disabled}>
      <label className="adm-field"><span>Nội dung câu hỏi</span><textarea className="adm-textarea" maxLength={4000} value={stem} onChange={(event) => setStem(event.target.value)} /></label>
      {choice ? <>
        {options.map((option, oi) => <fieldset className="adm-draft-fields" key={oi}>
          <legend>Lựa chọn {oi + 1}</legend>
          <label className="adm-field"><span>Mã lựa chọn {oi + 1}</span><input className="adm-input" maxLength={100} value={option.optionKey} onChange={(event) => {
            const nextKey = event.target.value
            if (correct === option.optionKey) setCorrect(nextKey)
            setOptions((current) => current.map((value, vi) => vi === oi ? { ...value, optionKey: nextKey } : value))
          }} /></label>
          <label className="adm-field"><span>Nội dung lựa chọn {oi + 1}</span><textarea className="adm-textarea" maxLength={4000} value={option.content} onChange={(event) => setOptions((current) => current.map((value, vi) => vi === oi ? { ...value, content: event.target.value } : value))} /></label>
          {option.optionKey !== correct ? <label className="adm-field"><span>Mã lỗi lựa chọn {oi + 1} (không bắt buộc)</span><input className="adm-input" maxLength={100} value={option.errorCode} onChange={(event) => setOptions((current) => current.map((value, vi) => vi === oi ? { ...value, errorCode: event.target.value } : value))} /></label> : null}
          <button className="adm-btn" type="button" disabled={disabled || options.length <= 2} onClick={() => setOptions((current) => current.filter((_, vi) => vi !== oi))}>Gỡ lựa chọn {oi + 1}</button>
        </fieldset>)}
        <button className="adm-btn" type="button" disabled={disabled || options.length >= 6} onClick={() => setOptions((current) => [...current, { optionKey: '', content: '', errorCode: '' }])}>Thêm lựa chọn</button>
        <label className="adm-field"><span>Đáp án đúng</span><select className="adm-select" value={correct} onChange={(event) => setCorrect(event.target.value)}><option value="">Chọn đáp án</option>{options.map((option, oi) => <option key={oi} value={option.optionKey}>{option.optionKey || `Lựa chọn ${oi + 1}`}</option>)}</select></label>
      </> : <><label className="adm-field"><span>Đáp án được chấp nhận (mỗi dòng một đáp án)</span><textarea className="adm-textarea" value={accepted} onChange={(event) => setAccepted(event.target.value)} /></label><small>Tối đa 20 đáp án, mỗi đáp án 500 ký tự.</small></>}
      <label className="adm-field"><span>Giải thích</span><textarea className="adm-textarea" maxLength={4000} value={explanation} onChange={(event) => setExplanation(event.target.value)} /></label>
      <div className="adm-draft-actions"><button className="adm-btn adm-btn--primary" type="submit">{disabled ? 'Đang lưu…' : 'Lưu câu hỏi'}</button><button className="adm-btn" type="button" onClick={onCancel}>Hủy sửa</button></div>
    </fieldset>
  </form>
}
