import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { Image, Smile, Target, Sparkles, Loader2, X } from 'lucide-react'
import { CATEGORY_LABELS } from '../utils/communityFormat'
import {
  getComposerBackground,
  canApplyBackground,
  MAX_BACKGROUND_POST_LENGTH,
  type ComposerBackgroundKey,
} from './composerBackgrounds'
import { ComposerBackgroundPicker } from './ComposerBackgroundPicker'
import { ComposerMediaPanel } from './ComposerMediaPanel'
import { EmojiPopover } from './EmojiPopover'
import './PostComposerModal.css'

export interface PostFormValues {
  category: 'GENERAL' | 'QUESTION' | 'DISCUSSION' | 'WRITING_SHARING' | 'SPEAKING_PARTNER' | 'RESOURCE_TIPS'
  title: string
  body: string
  imageUrls: string
  videoUrl: string
  targetBand: string
  background?: ComposerBackgroundKey | null
}

export interface PostComposerModalProps {
  isOpen: boolean
  isEditing: boolean
  form: UseFormReturn<PostFormValues>
  formValidationError: string
  categories: readonly ('GENERAL' | 'QUESTION' | 'DISCUSSION' | 'WRITING_SHARING' | 'SPEAKING_PARTNER' | 'RESOURCE_TIPS')[]
  userName?: string
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

export function PostComposerModal({
  isOpen,
  isEditing,
  form,
  formValidationError,
  categories,
  userName = 'Bạn',
  onSubmit,
  onClose,
}: PostComposerModalProps) {
  const {
    register,
    watch,
    setValue,
    formState: { isSubmitting },
  } = form

  const bodyValue = watch('body') || ''
  const titleValue = watch('title') || ''
  const imageUrlsValue = watch('imageUrls') || ''
  const videoUrlValue = watch('videoUrl') || ''
  const targetBandValue = watch('targetBand') || ''
  const categoryValue = watch('category') || 'GENERAL'
  const backgroundValue = watch('background') ?? null

  const [showMediaPanel, setShowMediaPanel] = useState(false)
  const [showEmojiPopover, setShowEmojiPopover] = useState(false)
  const [showTitleInput, setShowTitleInput] = useState(false)
  const [warningMessage, setWarningMessage] = useState('')

  const modalRef = useRef<HTMLElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const previousActiveElementRef = useRef<HTMLElement | null>(null)

  const parsedImageUrls = imageUrlsValue.split('\n').map((u) => u.trim()).filter(Boolean)
  const hasMedia = parsedImageUrls.length > 0 || Boolean(videoUrlValue.trim())
  const isOverBackgroundLimit = bodyValue.trim().length > MAX_BACKGROUND_POST_LENGTH

  // Background config
  const activeBgConfig = getComposerBackground(backgroundValue)

  const isDirty = Boolean(bodyValue.trim() || titleValue.trim() || imageUrlsValue.trim() || videoUrlValue.trim())

  const handleSafeClose = useCallback(() => {
    if (isDirty) {
      const confirmDiscard = window.confirm('Bạn có chắc muốn hủy bài viết đang soạn?')
      if (!confirmDiscard) return
    }
    onClose()
  }, [isDirty, onClose])

  const handleUpdateImageUrls = (urls: string[]) => {
    setValue('imageUrls', urls.join('\n'))
    if (urls.length > 0 && backgroundValue) {
      setValue('background', null)
      setWarningMessage('Đã bỏ màu nền vì bài viết có đính kèm ảnh hoặc video.')
      window.setTimeout(() => setWarningMessage(''), 4000)
    }
  }

  const handleUpdateVideoUrl = (url: string) => {
    setValue('videoUrl', url)
    if (url.trim() && backgroundValue) {
      setValue('background', null)
      setWarningMessage('Đã bỏ màu nền vì bài viết có đính kèm ảnh hoặc video.')
      window.setTimeout(() => setWarningMessage(''), 4000)
    }
  }

  const handleBodyChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    void textareaRest.onChange(e)
    const nextBody = e.target.value
    if (nextBody.trim().length > MAX_BACKGROUND_POST_LENGTH && backgroundValue) {
      setValue('background', null)
      setWarningMessage(`Màu nền chỉ hỗ trợ bài viết tối đa ${MAX_BACKGROUND_POST_LENGTH} ký tự.`)
      window.setTimeout(() => setWarningMessage(''), 4000)
    }
  }

  // Focus restoration & Escape handling
  useEffect(() => {
    if (!isOpen) return

    previousActiveElementRef.current = document.activeElement as HTMLElement
    const timer = window.setTimeout(() => textareaRef.current?.focus(), 50)

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        handleSafeClose()
      }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusable.length) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('keydown', handleKeyDown)
      previousActiveElementRef.current?.focus()
    }
  }, [isOpen, handleSafeClose])

  if (!isOpen) return null

  const handleInsertEmoji = (emoji: string) => {
    const textarea = textareaRef.current
    if (!textarea) {
      setValue('body', `${bodyValue}${emoji}`)
      return
    }
    const start = textarea.selectionStart ?? bodyValue.length
    const end = textarea.selectionEnd ?? bodyValue.length
    const nextBody = bodyValue.slice(0, start) + emoji + bodyValue.slice(end)
    setValue('body', nextBody)
    setShowEmojiPopover(false)
    requestAnimationFrame(() => {
      textarea.focus()
      const newPos = start + emoji.length
      textarea.setSelectionRange(newPos, newPos)
    })
  }

  // Dynamic font sizing
  const getFontSizeClass = () => {
    if (activeBgConfig) {
      if (bodyValue.length <= 85) return 'font-large'
      if (bodyValue.length <= 160) return 'font-medium'
      return 'font-normal'
    }
    if (bodyValue.length <= 85) return 'font-large'
    if (bodyValue.length <= 160) return 'font-medium'
    return 'font-normal'
  }

  const isBodyEmpty = !bodyValue.trim()
  const canSelectBg = canApplyBackground(bodyValue, parsedImageUrls.length, Boolean(videoUrlValue.trim()))
  const disabledBgReason = hasMedia
    ? 'Không thể chọn nền khi bài viết có ảnh hoặc video'
    : isOverBackgroundLimit
    ? `Không thể chọn nền khi bài viết quá ${MAX_BACKGROUND_POST_LENGTH} ký tự`
    : undefined

  const { ref: formTextareaRef, ...textareaRest } = register('body')

  return (
    <div
      className="composer-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) handleSafeClose()
      }}
    >
      <section
        ref={modalRef}
        className="composer-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-compose-title"
      >
        <header className="composer-header">
          <h2 id="community-compose-title" className="composer-title">
            {isEditing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}
          </h2>
          <button
            type="button"
            className="composer-close-btn"
            onClick={handleSafeClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={onSubmit} className="composer-form">
          {/* Author row */}
          <div className="composer-author-row">
            <div className="composer-author-avatar" aria-hidden="true">
              {userName.slice(0, 1).toUpperCase()}
            </div>
            <div className="composer-author-info">
              <span className="composer-author-name">{userName}</span>
              <div className="composer-pill-group">
                {/* Category select pill */}
                <label className="composer-select-pill">
                  <span>{CATEGORY_LABELS[categoryValue] ?? categoryValue}</span>
                  <select {...register('category')} aria-label="Chọn chủ đề">
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat] ?? cat}
                      </option>
                    ))}
                  </select>
                </label>

                {/* Target Band select pill */}
                <label className="composer-select-pill" title="Mục tiêu band điểm IELTS">
                  <Target size={13} />
                  <span>{targetBandValue ? `Band ${targetBandValue}` : 'Chọn Band'}</span>
                  <select {...register('targetBand')} aria-label="Chọn band mục tiêu">
                    <option value="">Không đặt band</option>
                    {[4.0, 4.5, 5.0, 5.5, 6.0, 6.5, 7.0, 7.5, 8.0, 8.5, 9.0].map((b) => (
                      <option key={b} value={b}>
                        Band {b.toFixed(1)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </div>

          {/* Optional Title input */}
          {showTitleInput || titleValue ? (
            <div className="composer-title-field">
              <input
                {...register('title')}
                maxLength={200}
                placeholder="Tiêu đề bài viết (không bắt buộc)"
                className="composer-title-input"
              />
            </div>
          ) : null}

          {/* Textarea container */}
          <div
            className={`composer-textarea-container ${activeBgConfig ? 'has-background' : ''}`}
            style={activeBgConfig ? { background: activeBgConfig.gradient } : undefined}
          >
            <textarea
              {...textareaRest}
              onChange={handleBodyChange}
              ref={(e) => {
                formTextareaRef(e)
                textareaRef.current = e
              }}
              rows={activeBgConfig ? 4 : 5}
              maxLength={20000}
              placeholder={`${userName}, bạn đang nghĩ gì thế?`}
              className={`composer-textarea ${getFontSizeClass()}`}
            />
          </div>

          {/* Indicators & notices */}
          <div className="composer-meta-indicators">
            {warningMessage ? (
              <span className="composer-auto-dismiss-alert" role="status">
                {warningMessage}
              </span>
            ) : formValidationError ? (
              <span className="composer-auto-dismiss-alert" role="alert">
                {formValidationError}
              </span>
            ) : <span />}

            <span
              className={`composer-char-counter ${
                bodyValue.length > 19800 || (activeBgConfig && bodyValue.length > 250) ? 'is-warning' : ''
              }`}
            >
              {activeBgConfig ? `${bodyValue.length}/${MAX_BACKGROUND_POST_LENGTH}` : `${bodyValue.length}/20000`}
            </span>
          </div>

          {/* Background palette */}
          <ComposerBackgroundPicker
            selectedKey={backgroundValue}
            onSelectKey={(k) => setValue('background', k)}
            disabled={!canSelectBg}
            disabledReason={disabledBgReason}
          />

          {/* Media panel */}
          {showMediaPanel && (
            <ComposerMediaPanel
              imageUrls={parsedImageUrls}
              onUpdateImageUrls={handleUpdateImageUrls}
              videoUrl={videoUrlValue}
              onUpdateVideoUrl={handleUpdateVideoUrl}
              onClose={() => setShowMediaPanel(false)}
            />
          )}

          {/* Emoji Popover */}
          {showEmojiPopover && (
            <EmojiPopover
              isOpen={showEmojiPopover}
              onSelectEmoji={handleInsertEmoji}
              onClose={() => setShowEmojiPopover(false)}
            />
          )}

          {/* Toolbar "Thêm vào bài viết của bạn" */}
          <div className="composer-toolbar-box">
            <span className="composer-toolbar-label">Thêm vào bài viết</span>
            <div className="composer-toolbar-actions">
              <button
                type="button"
                className={`composer-tool-btn ${showMediaPanel ? 'is-active' : ''}`}
                onClick={() => setShowMediaPanel((prev) => !prev)}
                aria-label="Đính kèm ảnh hoặc video"
                title="Ảnh / Video"
              >
                <Image size={20} color="#10b981" />
              </button>

              <button
                type="button"
                className={`composer-tool-btn ${showEmojiPopover ? 'is-active' : ''}`}
                onClick={() => setShowEmojiPopover((prev) => !prev)}
                aria-label="Chèn biểu tượng cảm xúc"
                title="Cảm xúc / Emoji"
              >
                <Smile size={20} color="#f59e0b" />
              </button>

              <button
                type="button"
                className={`composer-tool-btn ${showTitleInput ? 'is-active' : ''}`}
                onClick={() => setShowTitleInput((prev) => !prev)}
                aria-label="Thêm tiêu đề bài viết"
                title="Thêm tiêu đề"
              >
                <Sparkles size={20} color="#8b5cf6" />
              </button>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isBodyEmpty || isSubmitting}
            className={`composer-submit-btn ${isBodyEmpty || isSubmitting ? 'is-disabled' : 'is-active'}`}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={18} className="composer-submit-spinner" />
                <span>{isEditing ? 'Đang lưu…' : 'Đang đăng…'}</span>
              </>
            ) : (
              <span>{isEditing ? 'Lưu thay đổi' : 'Đăng'}</span>
            )}
          </button>
        </form>
      </section>
    </div>
  )
}
