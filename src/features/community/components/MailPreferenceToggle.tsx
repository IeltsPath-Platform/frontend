import { useEffect, useState } from 'react'
import { communityApi } from '../api/communityApi'

/**
 * Switch for learning emails: essay graded, result ready, late grading, and (for examiners) new jobs and jobs due soon.
 * Security and billing emails are always sent, so they have no switch here.
 */
export function MailPreferenceToggle() {
  const [learning, setLearning] = useState<boolean | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    communityApi.mailPreferences()
      .then((preferences) => setLearning(preferences.learning))
      .catch(() => setError('Không tải được tùy chọn email.'))
  }, [])

  async function change(next: boolean) {
    const previous = learning
    setLearning(next)
    setError('')
    try {
      const saved = await communityApi.updateMailPreferences(next)
      setLearning(saved.learning)
    } catch {
      setLearning(previous)
      setError('Không lưu được tùy chọn. Hãy thử lại.')
    }
  }

  return (
    <section className="notification-preferences-mail" aria-labelledby="mail-preference-title">
      <h2 id="mail-preference-title">Email học tập</h2>
      <p>Nhận email khi bài viết được chấm, có kết quả bài thi, hoặc (với giáo viên chấm bài) khi có bài mới và bài sắp quá hạn.</p>
      <p>Email về bảo mật và thanh toán luôn được gửi.</p>
      {error && <p role="alert">{error}</p>}
      {learning !== null && (
        <label>
          <input type="checkbox" role="switch" checked={learning} onChange={(event) => void change(event.target.checked)} />
          {' '}Bật email học tập
        </label>
      )}
    </section>
  )
}
