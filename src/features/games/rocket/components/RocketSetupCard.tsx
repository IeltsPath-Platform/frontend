import { useState } from 'react'
import { ArrowLeft, Heart, Rocket, Timer } from 'lucide-react'
import { Link } from 'react-router-dom'
import { isMockRocket, ROCKET_DEFAULT_WORD_COUNT, ROCKET_WORD_COUNTS } from '../api/rocketApi'
import { MOCK_DEFAULTS } from '../api/mockRocketApi'
import { WordFilterFields } from '../../components/WordFilterFields'
import { ANY_WORDS, useWordFilters, wordFilterError } from '../../lib/wordFilters'
import type { WordFilter } from '../../types/game'

type RocketSetupCardProps = {
  starting: boolean
  error: string | null
  onStart: (questionCount: number, wordFilter: WordFilter) => void
}

export function RocketSetupCard({ starting, error, onStart }: RocketSetupCardProps) {
  const [count, setCount] = useState(ROCKET_DEFAULT_WORD_COUNT)
  const [wordFilter, setWordFilter] = useState(ANY_WORDS)
  // The mock has a fixed word list with no levels or topics.
  const wordFilters = useWordFilters(!isMockRocket)
  const wordError = wordFilterError(wordFilters.filters, wordFilter, count)

  return (
    <section className="rocket-card rocket-setup" aria-labelledby="rocket-setup-title">
      <Link to="/games" className="rocket-back-link">
        <ArrowLeft size={16} /> Danh sách trò chơi
      </Link>
      <span className="rocket-eyebrow">Luyện từ vựng</span>
      <h1 id="rocket-setup-title">Tên lửa từ vựng</h1>
      <p className="rocket-muted">Đọc nghĩa tiếng Việt, lái tên lửa bay vào hành tinh mang từ tiếng Anh đúng.</p>

      <fieldset className="rocket-count">
        <legend>Số từ trong lượt chơi</legend>
        <div className="rocket-count-options" role="radiogroup">
          {ROCKET_WORD_COUNTS.map((value) => (
            <label key={value} className={value === count ? 'is-active' : ''}>
              <input type="radio" name="rocket-count" value={value} checked={value === count} onChange={() => setCount(value)} />
              {value}
            </label>
          ))}
        </div>
      </fieldset>

      {!isMockRocket && (
        <WordFilterFields
          value={wordFilter}
          onChange={setWordFilter}
          required={count}
          state={wordFilters}
          disabled={starting}
        />
      )}

      <ul className="rocket-rules">
        <li>
          <Heart size={16} /> {MOCK_DEFAULTS.initialLives} mạng — sai hoặc hết giờ mất 1 mạng
        </li>
        <li>
          <Timer size={16} /> {MOCK_DEFAULTS.secondsPerQuestion} giây mỗi từ — trả lời nhanh được thêm điểm
        </li>
      </ul>

      {error && (
        <p className="rocket-error" role="alert">
          {error}
        </p>
      )}

      <button type="button" className="rocket-primary" disabled={starting || Boolean(wordError)} onClick={() => onStart(count, wordFilter)}>
        <Rocket size={18} /> {starting ? 'Đang chuẩn bị…' : 'Bắt đầu bay'}
      </button>
      {isMockRocket && <p className="rocket-mock-note">Đang dùng dữ liệu thử (10 từ mẫu, chưa nối máy chủ).</p>}
    </section>
  )
}
