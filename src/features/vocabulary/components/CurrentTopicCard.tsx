import { Link } from 'react-router-dom'
import { BookOpen, ArrowRight } from 'lucide-react'
import type { TopicProgressItem } from '../api/notebookApi'

interface CurrentTopicCardProps {
  currentTopic: TopicProgressItem | null
}

export function CurrentTopicCard({ currentTopic }: CurrentTopicCardProps) {
  if (!currentTopic) {
    return (
      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <BookOpen size={18} style={{ color: '#2563eb' }} aria-hidden="true" />
          <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0f172a' }}>
            Chủ đề đang học
          </h3>
        </div>
        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
          Bạn chưa chọn chủ đề cụ thể nào. Hãy khám phá các bộ từ vựng theo chủ đề bên dưới để bắt đầu!
        </p>
      </div>
    )
  }

  const { name, total, learned, percent, nextWords } = currentTopic

  return (
    <div
      style={{
        background: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '1.25rem',
        padding: '1.25rem',
        boxShadow: '0 4px 16px rgba(0,0,0,0.03)',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.85rem',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BookOpen size={18} style={{ color: '#2563eb' }} aria-hidden="true" />
          <div>
            <span style={{ fontSize: '0.725rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: 700 }}>
              Chủ đề đang học
            </span>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800, color: '#0f172a' }}>
              {name}
            </h3>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: 800,
            padding: '0.2rem 0.6rem',
            borderRadius: '999px',
            background: percent >= 100 ? '#f0fdf4' : '#eff6ff',
            color: percent >= 100 ? '#166534' : '#1d4ed8',
          }}
        >
          {percent}% hoàn thành
        </span>
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#64748b', marginBottom: '0.35rem' }}>
          <span>Đã học {learned} / {total} từ</span>
        </div>
        <div style={{ height: '6px', background: '#f1f5f9', borderRadius: '999px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(100, percent)}%`,
              background: '#2563eb',
              borderRadius: '999px',
            }}
          />
        </div>
      </div>

      {/* Next words chips */}
      {nextWords && nextWords.length > 0 && (
        <div>
          <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Từ tiếp theo cần học:</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginTop: '0.35rem' }}>
            {nextWords.slice(0, 5).map((w) => (
              <Link
                key={w.id}
                to={`/vocabulary/${w.id}`}
                style={{
                  textDecoration: 'none',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: '#1e40af',
                  background: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: '0.4rem',
                  padding: '0.15rem 0.5rem',
                }}
              >
                {w.lemma}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.25rem' }}>
        <Link
          to={`/vocabulary?topicId=${currentTopic.topicId}`}
          style={{
            fontSize: '0.825rem',
            fontWeight: 700,
            color: '#2563eb',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
          }}
        >
          Tiếp tục chủ đề này
          <ArrowRight size={14} aria-hidden="true" />
        </Link>
      </div>
    </div>
  )
}

