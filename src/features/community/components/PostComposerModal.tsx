import type { FormEvent } from 'react'
import type { UseFormReturn } from 'react-hook-form'
import { CATEGORY_LABELS } from '../utils/communityFormat'

export interface PostFormValues {
  category: 'GENERAL' | 'QUESTION' | 'DISCUSSION' | 'WRITING_SHARING' | 'SPEAKING_PARTNER' | 'RESOURCE_TIPS'
  title: string
  body: string
  imageUrls: string
  videoUrl: string
  targetBand: string
}

export interface PostComposerModalProps {
  isOpen: boolean
  isEditing: boolean
  form: UseFormReturn<PostFormValues>
  formValidationError: string
  categories: readonly ('GENERAL' | 'QUESTION' | 'DISCUSSION' | 'WRITING_SHARING' | 'SPEAKING_PARTNER' | 'RESOURCE_TIPS')[]
  onSubmit: (event: FormEvent) => void
  onClose: () => void
}

export function PostComposerModal({
  isOpen,
  isEditing,
  form,
  formValidationError,
  categories,
  onSubmit,
  onClose,
}: PostComposerModalProps) {
  if (!isOpen) return null

  const {
    register,
    formState: { errors, isSubmitting },
  } = form

  return (
    <div
      className="community-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        className="community-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="community-compose-title"
      >
        <header>
          <h2 id="community-compose-title">
            {isEditing ? 'Chỉnh sửa bài viết' : 'Tạo bài viết'}
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        </header>

        <form onSubmit={onSubmit}>
          <label>
            Chủ đề
            <select {...register('category')}>
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_LABELS[cat] ?? cat}
                </option>
              ))}
            </select>
          </label>

          <label>
            Tiêu đề (không bắt buộc)
            <input
              {...register('title')}
              maxLength={200}
              placeholder="Tiêu đề bài viết ngắn gọn, súc tích"
            />
          </label>

          {formValidationError && (
            <p className="community-field-error" role="alert">
              {formValidationError}
            </p>
          )}

          <label>
            Nội dung
            <textarea
              {...register('body')}
              rows={6}
              maxLength={20000}
              placeholder="Bạn muốn chia sẻ điều gì với cộng đồng?"
            />
          </label>
          {errors.body && (
            <p className="community-field-error">{errors.body.message}</p>
          )}

          <label>
            Ảnh HTTPS (mỗi URL một dòng, tối đa 4)
            <textarea
              {...register('imageUrls')}
              rows={2}
              placeholder="https://..."
            />
          </label>
          {errors.imageUrls && (
            <p className="community-field-error">{errors.imageUrls.message}</p>
          )}

          <label>
            Video HTTPS
            <input {...register('videoUrl')} placeholder="https://..." />
          </label>

          <label>
            Band mục tiêu
            <input
              {...register('targetBand')}
              inputMode="decimal"
              placeholder="6.5"
            />
          </label>
          {errors.targetBand && (
            <p className="community-field-error">{errors.targetBand.message}</p>
          )}

          <footer>
            <button type="button" onClick={onClose}>
              Hủy
            </button>
            <button
              className="community-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Đang lưu…'
                : isEditing
                ? 'Lưu thay đổi'
                : 'Đăng bài'}
            </button>
          </footer>
        </form>
      </section>
    </div>
  )
}
