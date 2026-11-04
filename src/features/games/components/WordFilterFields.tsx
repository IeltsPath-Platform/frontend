import { BookOpen, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import './word-filters.css'
import dailyLife from '../assets/topics/daily-life.webp'
import education from '../assets/topics/education.webp'
import environment from '../assets/topics/environment.webp'
import health from '../assets/topics/health.webp'
import society from '../assets/topics/society.webp'
import technology from '../assets/topics/technology.webp'
import workBusiness from '../assets/topics/work-business.webp'
import type { WordFilter } from '../types/game'
import {
  availableWords,
  CEFR_LEVELS,
  wordFilterError,
  type WordFiltersState,
} from '../lib/wordFilters'

const LEVEL_NAMES: Record<string, string> = {
  A1: 'Cơ bản',
  A2: 'Sơ cấp',
  B1: 'Trung cấp',
  B2: 'Trung cao cấp',
  C1: 'Cao cấp',
  C2: 'Thành thạo',
}

/** A topic without its own picture, such as one an admin adds later, gets an icon. */
const TOPIC_IMAGES: Record<string, string> = {
  education,
  environment,
  technology,
  health,
  'work-business': workBusiness,
  society,
  'daily-life': dailyLife,
}

function SelectedMark() {
  return (
    <span className="game-word-tile-check" aria-hidden="true">
      <Check />
    </span>
  )
}

/**
 * Level and topic tiles for a room's words. Nothing chosen means any; choosing a tile again clears it.
 * Tiles that leave too few words, counted against the other choice, are disabled.
 */
export function WordFilterFields({
  value,
  onChange,
  required,
  state,
  disabled = false,
}: {
  value: WordFilter
  onChange: (value: WordFilter) => void
  required: number
  state: WordFiltersState
  disabled?: boolean
}) {
  const { filters } = state
  const tooFew = (choice: WordFilter) =>
    filters !== null && availableWords(filters, choice) < required
  const error = wordFilterError(filters, value, required)
  return (
    <div className="game-word-filters">
      <fieldset className="game-word-group">
        <legend>
          Trình độ <span>· Không chọn là tất cả</span>
        </legend>
        <div className="game-word-difficulty" aria-hidden="true">
          <span>Dễ hơn</span>
          <i />
          <span>Khó hơn</span>
        </div>
        <div className="game-word-levels">
          {CEFR_LEVELS.map((level, index) => {
            const selected = value.cefrLevel === level
            return (
              <button
                key={level}
                type="button"
                className="game-word-tile game-word-level"
                data-level={level}
                aria-pressed={selected}
                aria-label={`${level} ${LEVEL_NAMES[level]}`}
                disabled={
                  disabled ||
                  (!selected && tooFew({ ...value, cefrLevel: level }))
                }
                onClick={() =>
                  onChange({ ...value, cefrLevel: selected ? null : level })
                }
              >
                {selected && <SelectedMark />}
                <strong>{level}</strong>
                <span className="game-word-bars" aria-hidden="true">
                  {CEFR_LEVELS.map((bar, barIndex) => (
                    <i key={bar} data-on={barIndex <= index} />
                  ))}
                </span>
                <small>{LEVEL_NAMES[level]}</small>
              </button>
            )
          })}
        </div>
      </fieldset>
      <fieldset className="game-word-group">
        <legend>
          Chủ đề <span>· Không chọn là tất cả</span>
        </legend>
        {filters && (
          <div className="game-word-topics">
            {filters.topics.map((topic) => {
              const selected = value.topicId === topic.id
              const image = TOPIC_IMAGES[topic.slug]
              return (
                <button
                  key={topic.id}
                  type="button"
                  className="game-word-tile game-word-topic"
                  data-topic={topic.slug}
                  aria-pressed={selected}
                  disabled={
                    disabled ||
                    (!selected && tooFew({ ...value, topicId: topic.id }))
                  }
                  onClick={() =>
                    onChange({ ...value, topicId: selected ? null : topic.id })
                  }
                >
                  {selected && <SelectedMark />}
                  {image ? (
                    <img
                      className="game-word-topic-image"
                      src={image}
                      alt=""
                    />
                  ) : (
                    <span className="game-word-topic-icon" aria-hidden="true">
                      <BookOpen />
                    </span>
                  )}
                  <span>{topic.nameVi ?? topic.name}</span>
                </button>
              )
            })}
          </div>
        )}
        {state.loading && (
          <p className="game-word-filters-note" role="status">
            Đang tải chủ đề…
          </p>
        )}
        {state.failed && (
          <div className="game-word-filters-note" role="alert">
            <p>
              Chưa tải được chủ đề. Bạn vẫn có thể tiếp tục với lựa chọn hiện
              tại.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={state.retry}
            >
              Thử lại
            </Button>
          </div>
        )}
      </fieldset>
      {error && (
        <p className="game-word-filters-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
