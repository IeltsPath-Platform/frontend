import { useState, type FormEvent } from 'react'
import { HelpCircle } from 'lucide-react'
import { useToast } from '@/components/toast/toastContext'
import { codeSettingsSchema } from '@/lib/validation/codeSettings'
import { useFormErrors } from '@/lib/validation/useFormErrors'
import { AdminField } from '../../components/AdminField'
import { AdminModal } from '../../components/AdminLayer'
import { AdminSwitch } from '../../components/AdminSwitch'
import { AdminError, AdminLoading } from '../../components/AdminState'
import { AdminPage } from '../../pages/AdminPage'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminError } from '../../lib/useAdminError'
import { useAdminResource } from '../../lib/useAdminResource'
import { fetchCodeSettings, updateCodeSettings, type CodeSetting } from '../api/codeSettingsApi'
import './code-settings.css'

type Draft = Omit<CodeSetting, 'startNumber'> & { startNumber: string }

const KIND_NAME: Record<CodeSetting['kind'], string> = { COURSE: 'Khóa học', TOPIC: 'Chủ đề', LESSON: 'Bài học', PACKAGE: 'Gói đề', KNOWLEDGE_POINT: 'Điểm kiến thức', ERROR_TYPE: 'Mã lỗi' }

/** The keywords besides the sequence number that each kind of code accepts, for the help beside the pattern. */
const KEYWORD_HELP: Record<CodeSetting['kind'], Array<[string, string]>> = {
  COURSE: [['{BAND}', 'band khóa học, ví dụ 6 hoặc 6.0 thành 6_0.'], ['{YYYY}', 'năm hiện tại.']],
  TOPIC: [['{COURSE}', 'mã khóa học đã chọn.'], ['{SKILL}', 'L, R, W hoặc S theo kỹ năng.']],
  LESSON: [['{TOPIC}', 'mã chủ đề chứa bài học.']],
  PACKAGE: [['{COURSE}', 'mã khóa học của gói. Gói không thuộc khóa nào dùng PKG_{TYPE}{SEQ:3}.'], ['{TYPE}', 'viết tắt loại gói: PS, TT, CT, PT, MT, PL, QZ hoặc LS.']],
  KNOWLEDGE_POINT: [['{PREFIX}', 'chữ đầu suy ra từ loại và kỹ năng.'], ['{LEVEL}', 'mức band 55, 60, 65 hoặc 70.'], ['{NAME}', 'tên điểm kiến thức đã chuẩn hóa.']],
  ERROR_TYPE: [['{NAME}', 'tên mã lỗi đã chuẩn hóa: chữ in hoa, bỏ dấu, nối bằng gạch dưới, tối đa 60 ký tự.']],
}

function draftFrom(setting: CodeSetting): Draft { return { ...setting, startNumber: String(setting.startNumber) } }

export function CodeSettingsPage() {
  const resource = useAdminResource('code-settings', fetchCodeSettings)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  if (resource.status === 'loading') return <AdminPage title="Thiết lập chung các tham số"><AdminLoading /></AdminPage>
  if (resource.status === 'error') return <AdminPage title="Thiết lập chung các tham số"><AdminError message={resource.error ?? ''} onRetry={resource.reload} /></AdminPage>
  const settings = resource.data ?? []
  return <AdminPage plain title="Thiết lập chung các tham số">
    <nav aria-label="Tab thiết lập tham số" className="adm-code-settings__tabs" role="tablist">
      <button aria-selected="true" className="adm-code-settings__tab is-active" role="tab" type="button">Bộ mã tự sinh</button>
    </nav>
    {settings.map((setting, index) => {
      const draft = drafts[setting.kind] ?? draftFrom(setting)
      return <CodeSettingEditor key={setting.kind} index={index + 1} setting={draft} onChange={(next) => setDrafts((current) => ({ ...current, [setting.kind]: next }))} />
    })}
  </AdminPage>
}

function CodeSettingEditor({ index, setting, onChange }: { index: number; setting: Draft; onChange: (draft: Draft) => void }) {
  const [helpOpen, setHelpOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [, setError] = useAdminError()
  const { toast } = useToast()
  const form = useFormErrors(codeSettingsSchema(setting.kind), { pattern: setting.pattern, startNumber: setting.startNumber })
  const kindName = KIND_NAME[setting.kind]

  async function save(event: FormEvent) {
    event.preventDefault()
    if (saving || !form.validate()) return
    setSaving(true)
    setError(null)
    try {
      const saved = await updateCodeSettings(setting.kind, {
        applied: setting.applied,
        pattern: setting.pattern.trim(),
        startNumber: Number(setting.startNumber),
        editable: setting.editable,
      })
      onChange(draftFrom(saved))
      toast({ title: 'Thành công', description: 'Đã lưu thiết lập bộ mã.', tone: 'success' })
    } catch (reason) {
      setError(adminErrorMessage(reason))
    } finally { setSaving(false) }
  }

  return <details className="adm-block adm-code-settings" open>
    <summary className="adm-code-settings__heading">{index}. Thiết lập bộ mã {kindName} tự sinh</summary>
    <form aria-label={`Thiết lập bộ mã ${kindName}`} className="adm-code-settings__form" noValidate onSubmit={(event) => void save(event)}>
      <div className="adm-code-settings__row">
        <AdminSwitch checked={setting.applied} onChange={(applied) => onChange({ ...setting, applied })}>Có áp dụng</AdminSwitch>
      </div>
      <div className="adm-code-settings__row">
        <div className="adm-code-settings__pattern">
          <AdminField label="Cấu trúc bộ mã" {...form.field('pattern')}>
            <input className="adm-input" maxLength={255} value={setting.pattern} onChange={(event) => onChange({ ...setting, pattern: event.target.value })} />
          </AdminField>
          <button aria-label="Từ khóa dùng được" className="adm-code-settings__help" onClick={() => setHelpOpen(true)} type="button"><HelpCircle aria-hidden="true" size={19} /></button>
        </div>
      </div>
      <div className="adm-code-settings__row">
        <AdminField label="Số bắt đầu khởi tạo" {...form.field('startNumber')}>
          <input className="adm-input" inputMode="numeric" value={setting.startNumber} onChange={(event) => onChange({ ...setting, startNumber: event.target.value })} />
        </AdminField>
      </div>
      <div className="adm-code-settings__row">
        <AdminSwitch checked={setting.editable} onChange={(editable) => onChange({ ...setting, editable })}>Cho phép hiệu chỉnh lại mã</AdminSwitch>
      </div>
      <div className="adm-form-footer"><button className="adm-btn adm-btn--primary" disabled={saving} type="submit">Lưu</button></div>
    </form>
    {helpOpen ? <AdminModal title="Từ khóa dùng được" onClose={() => setHelpOpen(false)}>
      <ul className="adm-code-settings__tokens">
        {setting.kind === 'KNOWLEDGE_POINT' || setting.kind === 'ERROR_TYPE' ? null
          : <li><code>{'{SEQ}'}</code>, <code>{'{SEQ:n}'}</code>: số thứ tự; <code>n</code> là số chữ số tối thiểu.</li>}
        {KEYWORD_HELP[setting.kind].map(([keyword, meaning]) => <li key={keyword}><code>{keyword}</code>: {meaning}</li>)}
      </ul>
    </AdminModal> : null}
  </details>
}
