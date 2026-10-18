import { useRef, type FormEvent, type KeyboardEvent } from 'react'
import { Send } from 'lucide-react'
import type { Comment, PublicProfile } from '../api/communityApi'

export function CommentBody({ body }: { body: string }) {
  const parts = body.split(/@\[([^\]]+)]\([0-9a-fA-F-]{36}\)/g)
  return (
    <>
      {parts.map((part, index) =>
        index % 2 ? (
          <span className="community-mention" key={index}>
            @{part}
          </span>
        ) : (
          part
        ),
      )}
    </>
  )
}

export interface CommentSectionProps {
  postId: string
  currentUserId?: string | null
  comments: Comment[]
  replies: Record<string, Comment[]>
  replyTo?: string
  editingComment: Comment | null
  editedCommentBody: string
  commentText: string
  mentionSuggestions: PublicProfile[]
  mentionIndex: number
  onSetCommentText: (text: string) => void
  onUpdateMentionQuery: (value: string, caret: number) => void
  onMentionKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void
  onInsertMention: (person: PublicProfile) => void
  onSendComment: (event: FormEvent) => void
  onReplyTo: (commentId?: string) => void
  onStartEditComment: (comment: Comment) => void
  onCancelEditComment: () => void
  onChangeEditedCommentBody: (body: string) => void
  onSaveCommentEdit: (event: FormEvent) => void
  onDeleteComment: (commentId: string) => void
  onOpenReplies: (commentId: string) => void
  onOpenReport: (target: { type: 'POST' | 'COMMENT'; id: string }) => void
}

export function CommentSection({
  postId,
  currentUserId,
  comments,
  replies,
  replyTo,
  editingComment,
  editedCommentBody,
  commentText,
  mentionSuggestions,
  mentionIndex,
  onSetCommentText,
  onUpdateMentionQuery,
  onMentionKeyDown,
  onInsertMention,
  onSendComment,
  onReplyTo,
  onStartEditComment,
  onCancelEditComment,
  onChangeEditedCommentBody,
  onSaveCommentEdit,
  onDeleteComment,
  onOpenReplies,
  onOpenReport,
}: CommentSectionProps) {
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  return (
    <section className="community-comments" aria-label="Khu vực bình luận">
      <h3 className="community-comments-heading">Bình luận</h3>

      {comments.length === 0 ? (
        <p className="community-no-comments">Chưa có bình luận. Hãy mở đầu cuộc trò chuyện.</p>
      ) : (
        <div className="community-comments-list">
          {comments.map((comment) => (
            <div className="community-comment" key={comment.id}>
              {editingComment?.id === comment.id ? (
                <form onSubmit={onSaveCommentEdit} className="community-edit-comment-form">
                  <label className="sr-only" htmlFor={`edit-comment-${comment.id}`}>
                    Sửa bình luận
                  </label>
                  <input
                    id={`edit-comment-${comment.id}`}
                    value={editedCommentBody}
                    onChange={(e) => onChangeEditedCommentBody(e.target.value)}
                    maxLength={2000}
                    className="community-edit-comment-input"
                  />
                  <div className="community-edit-comment-buttons">
                    <button type="submit" className="community-primary-sm">Lưu</button>
                    <button type="button" onClick={onCancelEditComment} className="community-secondary-sm">Hủy</button>
                  </div>
                </form>
              ) : (
                <div className="community-comment-bubble">
                  <span className="community-comment-author-name">
                    {comment.author?.displayName ?? 'Học viên'}
                  </span>
                  <p className="community-comment-text">
                    <CommentBody body={comment.body} />
                  </p>
                </div>
              )}

              <div className="community-comment-actions">
                <button
                  type="button"
                  onClick={() => {
                    onReplyTo(comment.id)
                    document.getElementById(`comment-${postId}`)?.focus()
                  }}
                >
                  Trả lời
                </button>
                {comment.authorId !== currentUserId && (
                  <button
                    type="button"
                    onClick={() => onOpenReport({ type: 'COMMENT', id: comment.id })}
                  >
                    Báo cáo bình luận
                  </button>
                )}
                {comment.authorId === currentUserId && (
                  <>
                    <button type="button" onClick={() => onStartEditComment(comment)}>
                      Sửa
                    </button>
                    <button
                      type="button"
                      className="community-delete-comment-btn"
                      onClick={() => onDeleteComment(comment.id)}
                    >
                      Xóa
                    </button>
                  </>
                )}
                {comment.replyCount > 0 && (
                  <button type="button" onClick={() => onOpenReplies(comment.id)}>
                    {replies[comment.id] ? 'Ẩn phản hồi' : `Xem ${comment.replyCount} phản hồi`}
                  </button>
                )}
              </div>

              {/* Replies list */}
              {replies[comment.id]?.map((reply) => (
                <div className="community-reply" key={reply.id}>
                  <div className="community-comment-bubble">
                    <span className="community-comment-author-name">
                      {reply.author?.displayName ?? 'Học viên'}
                    </span>
                    <p className="community-comment-text">
                      <CommentBody body={reply.body} />
                    </p>
                  </div>
                  {reply.authorId !== currentUserId && (
                    <div className="community-comment-actions">
                      <button
                        type="button"
                        onClick={() => onOpenReport({ type: 'COMMENT', id: reply.id })}
                      >
                        Báo cáo phản hồi
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Form viết bình luận */}
      <form onSubmit={onSendComment} className="community-comment-form">
        <label className="sr-only" htmlFor={`comment-${postId}`}>
          {replyTo ? 'Viết phản hồi' : 'Viết bình luận'}
        </label>
        <div className="community-comment-input-wrap">
          {replyTo && (
            <div className="community-replying-banner">
              <span>Đang trả lời bình luận</span>
              <button
                type="button"
                onClick={() => onReplyTo(undefined)}
                aria-label="Hủy trả lời"
              >
                ×
              </button>
            </div>
          )}
          <textarea
            ref={commentInputRef}
            id={`comment-${postId}`}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={mentionSuggestions.length > 0}
            aria-controls={`mention-list-${postId}`}
            aria-activedescendant={
              mentionSuggestions.length ? `mention-option-${mentionIndex}-${postId}` : undefined
            }
            value={commentText}
            onChange={(event) => {
              onSetCommentText(event.target.value)
              onUpdateMentionQuery(event.target.value, event.target.selectionStart)
            }}
            onKeyDown={onMentionKeyDown}
            maxLength={5000}
            rows={2}
            placeholder={replyTo ? 'Trả lời bình luận...' : 'Viết bình luận...'}
            className="community-comment-textarea"
          />

          {/* Autocomplete mention suggestions */}
          {mentionSuggestions.length > 0 && (
            <div
              className="community-mention-list"
              role="listbox"
              id={`mention-list-${postId}`}
              aria-label="Gợi ý người được nhắc"
            >
              {mentionSuggestions.map((person, index) => (
                <button
                  type="button"
                  role="option"
                  aria-selected={index === mentionIndex}
                  id={`mention-option-${index}-${postId}`}
                  key={person.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onInsertMention(person)}
                  className={`community-mention-item ${index === mentionIndex ? 'is-selected' : ''}`}
                >
                  <span className="community-mention-name">{person.displayName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="submit" aria-label="Gửi bình luận" className="community-comment-submit-btn">
          <Send size={17} />
        </button>
      </form>
    </section>
  )
}

