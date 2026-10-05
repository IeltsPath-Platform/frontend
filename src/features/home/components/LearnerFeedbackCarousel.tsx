import { Heart, Pause, Play, Share2, Star, ThumbsUp } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import './LearnerFeedbackCarousel.css'

const feedbacks = [
  {
    id: 1,
    name: 'THU HÀ',
    role: 'Sale Manager',
    avatar: 'https://thespace.edu.vn/_image?href=%2F_astro%2Fimg-thu-ha-hvdc.CANlz3XS.png&w=300&h=300&f=webp',
    rating: 5,
    bandScore: '7.0 IELTS',
    content: '“Mình là dân đi làm nên thật sự không có thời gian ngày nào cũng ngồi cày 3-4 tiếng như các bạn. Cái mình thích nhất ở THE IELTS SPACE là không bắt học dàn trải. AI phân tích khá rõ mình đang yếu kỹ năng nào, dạng bài nào mất điểm nhiều và cả những lỗi bị lặp lại. Đợt đầu mình cứ nghĩ do ngữ pháp yếu nhưng hóa ra thứ kéo điểm xuống nhiều nhất lại là vốn từ vựng collocation :)) Mình đã nhờ AI lên kế hoạch học tập cho và mentor bổ sung thêm bài luyện riêng. Sau 4 tháng mình đã từ 6.0 lên 7.0 overall”',
    reactions: { likes: 120, shares: 10, types: ['heart'] },
  },
  {
    id: 2,
    name: 'MINH ANH',
    role: 'Học sinh lớp 12, Hà Nội',
    avatar: 'https://thespace.edu.vn/_image?href=%2F_astro%2Fimg-thu-thuy-hvdc.u2wGLr7r.png&w=300&h=300&f=webp',
    rating: 5,
    bandScore: null,
    content: '“Em vừa nhận điểm nên phải lên feedback luôn ạ 🥳 7.5 overall. Trước em học dàn trải mệt mỏi lắm. Sang đây em thích nhất là có AI sửa lỗi liên tục, dashboard rất rõ ràng để em theo dõi tiến độ nên đỡ học lan man hơn. Cảm ơn cô Mai rất nhiều vì đã cứu Writing của em từ 5.5...”',
    reactions: { likes: 348, shares: 67, types: ['heart', 'like'] },
  },
  {
    id: 3,
    name: 'ĐẮC HƯNG',
    role: 'Học viên tại Hưng Yên',
    avatar: 'https://thespace.edu.vn/_image?href=%2F_astro%2Fimg-tuan-kiet-hvdc.DBrll_7-.png&w=300&h=300&f=webp',
    rating: 5,
    bandScore: '5.5 IELTS',
    content: '“Trước đi học chả hiểu cái gì, học trước quên sau, bạn cùng lớp thì cứ giơ tay trả lời làm em rất áp lực. Qua đây thấy nhẹ nhàng hẳn. Học đúng bản chất, tư duy chứ không bắt nhớ quá nhiều công thức, sau đó có bài luyện ngay trên hệ thống nên dễ nhớ hơn. Hiện em đã đạt 5.5 và đang học tiếp aim 6.5”',
    reactions: { likes: 215, shares: 18, types: ['heart', 'like'] },
  },
] as const

type Feedback = (typeof feedbacks)[number]

function FeedbackCard({ feedback }: { feedback: Feedback }) {
  const hasHeart = feedback.reactions.types.some((type) => type === 'heart')
  const hasLike = feedback.reactions.types.some((type) => type === 'like')

  return (
    <article className="learner-feedback-card" role="listitem">
      <header className="learner-feedback-card-header">
        <img src={feedback.avatar} alt={`Ảnh học viên ${feedback.name}`} width="56" height="56" loading="lazy" decoding="async" />
        <div className="learner-feedback-identity">
          <h3>{feedback.name}</h3>
          <p>{feedback.role}</p>
          <div className="learner-feedback-stars" aria-label={`${feedback.rating} trên 5 sao`}>
            {Array.from({ length: feedback.rating }, (_, index) => <Star key={index} aria-hidden="true" />)}
          </div>
        </div>
        {feedback.bandScore && <span className="learner-feedback-band">{feedback.bandScore}</span>}
      </header>

      <blockquote>{feedback.content}</blockquote>

      <footer className="learner-feedback-reactions" aria-label="Lượt tương tác">
        <span aria-label={`${feedback.reactions.likes} lượt thích`}>
          {hasHeart && <Heart className="is-heart" aria-hidden="true" />}
          {hasLike && <ThumbsUp className="is-like" aria-hidden="true" />}
          <strong>{feedback.reactions.likes}</strong>
        </span>
        <span aria-label={`${feedback.reactions.shares} lượt chia sẻ`}><Share2 aria-hidden="true" /><strong>{feedback.reactions.shares}</strong></span>
      </footer>
    </article>
  )
}

export function LearnerFeedbackCarousel() {
  const [isPaused, setIsPaused] = useState(false)

  return (
    <section className="learner-feedback-section home-section" aria-labelledby="learner-feedback-title">
      <div className="learner-feedback-heading">
        <div>
          <span>HỌC VIÊN NÓI GÌ VỀ CHÚNG TÔI</span>
          <h2 id="learner-feedback-title">Hành trình thật. Kết quả thật.</h2>
          <p>Những chia sẻ từ học viên đã hoàn thành lộ trình tại The IELTS Space.</p>
        </div>
        <Button type="button" variant="outline" className="learner-feedback-toggle" aria-pressed={isPaused} onClick={() => setIsPaused((value) => !value)}>
          {isPaused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          {isPaused ? 'Tiếp tục chạy' : 'Tạm dừng'}
        </Button>
      </div>

      <div className={`learner-feedback-viewport${isPaused ? ' is-paused' : ''}`}>
        <div className="learner-feedback-track" role="list" aria-label="Nhận xét của học viên">
          <div className="learner-feedback-group">
            {feedbacks.map((feedback) => <FeedbackCard key={feedback.id} feedback={feedback} />)}
          </div>
          <div className="learner-feedback-group" aria-hidden="true">
            {feedbacks.map((feedback) => <FeedbackCard key={`duplicate-${feedback.id}`} feedback={feedback} />)}
          </div>
        </div>
      </div>
    </section>
  )
}
