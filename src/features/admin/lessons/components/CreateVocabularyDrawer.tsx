import { useState, type FormEvent } from 'react'
import { X } from 'lucide-react'
import { AdminDrawer } from '../../components/AdminLayer'
import { adminErrorMessage } from '../../lib/adminErrors'
import { useAdminErrorToast } from '../../lib/useAdminError'
import { PART_OF_SPEECH_LABELS } from '../../course-drafts/lib/courseDraftLabels'
import { ChoiceChips } from '../../knowledge-graph/components/ChoiceChips'
import { uploadAdminImage } from '../../media/api/mediaUploadApi'
import { addVocabularySense, createVocabularyItem, uploadVocabularyPronunciation, type CreatedVocabularyItem } from '../api/lessonApi'

const POS_OPTIONS = Object.entries(PART_OF_SPEECH_LABELS).map(([value, label]) => ({ value, label }))
const SENSE_IMAGE_ENDPOINT = '/api/content/admin/vocabulary/sense-images'

/** The library refuses a word it already has (the message names it in English); show that in Vietnamese instead. */
function creationErrorMessage(reason: unknown, lemma: string): string {
  if (reason instanceof Error && /already exists/i.test(reason.message)) return `Từ “${lemma}” đã có trong thư viện.`
  return adminErrorMessage(reason)
}

/** A picture field. It uploads on pick and then shows the stored picture. */
function ImageField({ url, disabled, onPick, onClear }: {
  url: string | null
  disabled: boolean
  onPick: (file: File) => void
  onClear: () => void
}) {
  return (
    <div className="ls-create-vocab__upload">
      <label className="adm-field">
        <span>Ảnh</span>
        <input
          accept="image/jpeg,image/png,image/webp"
          className="adm-input"
          disabled={disabled}
          onChange={(event) => { const file = event.target.files?.[0]; if (file) onPick(file) }}
          type="file"
        />
      </label>
      {url ? (
        <div className="ls-create-vocab__stored">
          <img alt="Ảnh của nghĩa" src={url} />
          <button aria-label="Bỏ ảnh" className="adm-btn adm-btn--small" disabled={disabled} onClick={onClear} type="button">
            <X aria-hidden="true" size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * A pronunciation field. The file is only chosen here: it is uploaded when Lưu runs, under the lemma as it is then.
 * Once stored, the clip can be played.
 */
function AudioField({ label, file, url, disabled, onPick, onClear }: {
  label: string
  file: File | null
  url: string | null
  disabled: boolean
  onPick: (file: File) => void
  onClear: () => void
}) {
  return (
    <div className="ls-create-vocab__upload">
      <label className="adm-field">
        <span>{label}</span>
        <input
          accept="audio/*"
          className="adm-input"
          disabled={disabled}
          onChange={(event) => { const picked = event.target.files?.[0]; if (picked) onPick(picked) }}
          type="file"
        />
      </label>
      {url || file ? (
        <div className="ls-create-vocab__stored">
          {url ? <audio controls preload="none" src={url} /> : <span className="adm-muted">{file?.name}</span>}
          <button aria-label={`Bỏ ${label.toLowerCase()}`} className="adm-btn adm-btn--small" disabled={disabled} onClick={onClear} type="button">
            <X aria-hidden="true" size={14} />
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * Creates a new word in the library with its first meaning, then hands the new sense back to the picker. The picture
 * uploads as soon as it is picked. Saving uploads the pronunciation files under the word, creates the word, then adds the
 * meaning. If a step fails, what was already stored is kept, so the next Lưu does only the steps still missing and no
 * duplicate word is made.
 */
function CreateVocabularyForm({ initialLemma, onCreated, onClose }: {
  initialLemma: string
  onCreated: (senseId: string, lemma: string) => void
  onClose: () => void
}) {
  const [lemma, setLemma] = useState(initialLemma)
  const [ipa, setIpa] = useState('')
  const [partOfSpeech, setPartOfSpeech] = useState('')
  const [vietnameseMeaning, setVietnameseMeaning] = useState('')
  const [englishDefinition, setEnglishDefinition] = useState('')
  const [exampleSentence, setExampleSentence] = useState('')
  const [image, setImage] = useState<string | null>(null)
  const [usFile, setUsFile] = useState<File | null>(null)
  const [usUrl, setUsUrl] = useState<string | null>(null)
  const [ukFile, setUkFile] = useState<File | null>(null)
  const [ukUrl, setUkUrl] = useState<string | null>(null)
  const [uploadingImage, setUploadingImage] = useState(0)
  /** The saved word and the meanings it had then; set once the word exists, so a retry only adds the meaning. */
  const [saved, setSaved] = useState<CreatedVocabularyItem | null>(null)
  const [saving, setSaving] = useState(false)
  const fail = useAdminErrorToast()
  const locked = saved !== null

  async function uploadImage(file: File) {
    setUploadingImage((count) => count + 1)
    try {
      const stored = await uploadAdminImage(SENSE_IMAGE_ENDPOINT, file)
      setImage(stored.mediaUrl ?? null)
    } catch (reason) {
      fail(adminErrorMessage(reason))
    } finally {
      setUploadingImage((count) => count - 1)
    }
  }

  /** Uploads one pronunciation file under the lemma as it is now, once; a stored clip is reused on the next Lưu. */
  async function storeAudio(accent: 'us' | 'uk'): Promise<string | null> {
    const file = accent === 'us' ? usFile : ukFile
    const stored = accent === 'us' ? usUrl : ukUrl
    if (stored || !file) return stored
    const url = await uploadVocabularyPronunciation(lemma.trim(), accent, file)
    if (accent === 'us') setUsUrl(url)
    else setUkUrl(url)
    return url
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!lemma.trim() || !partOfSpeech || !vietnameseMeaning.trim() || !exampleSentence.trim()) {
      fail('Cần nhập từ, loại từ, nghĩa tiếng Việt và câu ví dụ.')
      return
    }
    if (uploadingImage > 0) {
      fail('Chờ tải ảnh xong rồi mới lưu.')
      return
    }
    setSaving(true)
    let word = saved
    try {
      if (!word) {
        const audioUs = await storeAudio('us')
        const audioUk = await storeAudio('uk')
        // The IPA goes to the old column lesson cards read and to the US column.
        const ipaValue = ipa.trim() || null
        word = await createVocabularyItem({ lemma: lemma.trim(), ipa: ipaValue, ipaUs: ipaValue, audioUsReference: audioUs, audioUkReference: audioUk })
        setSaved(word)
      }
      const senseId = await addVocabularySense(word.id, {
        partOfSpeech,
        englishDefinition: englishDefinition.trim() || null,
        vietnameseMeaning: vietnameseMeaning.trim(),
        exampleSentence: exampleSentence.trim(),
        imageUrl: image,
      }, word.senseIds)
      onCreated(senseId, lemma.trim())
    } catch (reason) {
      fail(word ? `Đã lưu từ “${lemma.trim()}” nhưng chưa hoàn tất: ${adminErrorMessage(reason)}` : creationErrorMessage(reason, lemma.trim()))
    } finally {
      setSaving(false)
    }
  }

  return (
    <form aria-label="Từ vựng mới" noValidate onSubmit={(event) => void submit(event)}>
      {/* One fieldset around the fields: the drawer's CSS stretches a form's lone fieldset, so the free space goes above the buttons. */}
      <fieldset className="ls-create-vocab">
        <div className="adm-filters">
          <label className="adm-field">
            <span>Từ<span aria-hidden="true" className="adm-required" /></span>
            <input aria-required="true" className="adm-input" disabled={locked} onChange={(event) => setLemma(event.target.value)} value={lemma} />
          </label>
          <label className="adm-field">
            <span>IPA</span>
            <input className="adm-input" disabled={locked} onChange={(event) => setIpa(event.target.value)} value={ipa} />
          </label>
        </div>
        <div className="adm-filters">
          <AudioField
            disabled={locked}
            file={usFile}
            label="Phát âm US"
            onClear={() => { setUsFile(null); setUsUrl(null) }}
            onPick={(file) => { setUsFile(file); setUsUrl(null) }}
            url={usUrl}
          />
          <AudioField
            disabled={locked}
            file={ukFile}
            label="Phát âm UK"
            onClear={() => { setUkFile(null); setUkUrl(null) }}
            onPick={(file) => { setUkFile(file); setUkUrl(null) }}
            url={ukUrl}
          />
        </div>
        <ChoiceChips label="Loại từ" onChange={setPartOfSpeech} options={POS_OPTIONS} required value={partOfSpeech} />
        <label className="adm-field">
          <span>Nghĩa tiếng Việt<span aria-hidden="true" className="adm-required" /></span>
          <input aria-required="true" className="adm-input" onChange={(event) => setVietnameseMeaning(event.target.value)} value={vietnameseMeaning} />
        </label>
        <label className="adm-field">
          <span>Nghĩa tiếng Anh</span>
          <textarea className="adm-textarea" onChange={(event) => setEnglishDefinition(event.target.value)} value={englishDefinition} />
        </label>
        <label className="adm-field">
          <span>Câu ví dụ<span aria-hidden="true" className="adm-required" /></span>
          <textarea aria-required="true" className="adm-textarea" onChange={(event) => setExampleSentence(event.target.value)} value={exampleSentence} />
        </label>
        <ImageField disabled={locked} onClear={() => setImage(null)} onPick={(file) => void uploadImage(file)} url={image} />
      </fieldset>
      <div className="adm-form-footer">
        <button className="adm-btn" disabled={saving} onClick={onClose} type="button">Đóng</button>
        <button aria-label="Lưu từ vựng mới" className="adm-btn adm-btn--primary" disabled={saving || uploadingImage > 0} type="submit">
          {saving ? 'Đang lưu…' : uploadingImage > 0 ? 'Đang tải ảnh…' : 'Lưu'}
        </button>
      </div>
    </form>
  )
}

/** The drawer over the picker for a word the library does not have yet. Opens with the word the author searched for. */
export function CreateVocabularyDrawer({ initialLemma, onCreated, onClose }: {
  initialLemma: string
  onCreated: (senseId: string, lemma: string) => void
  onClose: () => void
}) {
  return (
    <AdminDrawer onClose={onClose} stacked title="Tạo từ vựng mới">
      <CreateVocabularyForm initialLemma={initialLemma} onClose={onClose} onCreated={onCreated} />
    </AdminDrawer>
  )
}
