import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WordFilter } from '../types/game'
import {
  availableWords,
  CEFR_LEVELS,
  wordFilterError,
  type WordFiltersState,
} from '../lib/wordFilters'

const ALL = 'ALL'
const itemClass =
  'min-h-11 cursor-pointer rounded-lg px-3 text-base focus:bg-primary/10 focus:text-primary data-[state=checked]:bg-primary/10 data-[state=checked]:font-semibold data-[state=checked]:text-primary'

type Option = { value: string; label: string; words: number | null }

function FilterSelect({
  id,
  label,
  value,
  options,
  required,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: string
  options: Option[]
  required: number
  disabled: boolean
  onChange: (value: string) => void
}) {
  return (
    <div className="game-field">
      <label htmlFor={id}>{label}</label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className="min-h-12 w-full rounded-xl bg-background px-4 text-base text-foreground"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          position="popper"
          side="bottom"
          align="start"
          sideOffset={6}
          className="z-[90] w-[var(--radix-select-trigger-width)] rounded-xl border border-border bg-popover p-1.5 shadow-lg"
        >
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              disabled={option.words !== null && option.words < required}
              className={itemClass}
            >
              {option.label}
              {option.words !== null && ` · ${option.words} từ`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

/** Level and topic for a room's words. Options with too few words are dimmed, counted against the other field. */
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
  const count = (choice: WordFilter) =>
    filters ? availableWords(filters, choice) : null
  const error = wordFilterError(filters, value, required)
  return (
    <div className="game-word-filters">
      <FilterSelect
        id="game-word-level"
        label="Trình độ"
        value={value.cefrLevel ?? ALL}
        required={required}
        disabled={disabled || !filters}
        onChange={(next) =>
          onChange({ ...value, cefrLevel: next === ALL ? null : next })
        }
        options={[
          {
            value: ALL,
            label: 'Tất cả',
            words: count({ ...value, cefrLevel: null }),
          },
          ...CEFR_LEVELS.map((level) => ({
            value: level,
            label: level,
            words: count({ ...value, cefrLevel: level }),
          })),
        ]}
      />
      <FilterSelect
        id="game-word-topic"
        label="Chủ đề"
        value={value.topicId ?? ALL}
        required={required}
        disabled={disabled || !filters}
        onChange={(next) =>
          onChange({ ...value, topicId: next === ALL ? null : next })
        }
        options={[
          {
            value: ALL,
            label: 'Tất cả',
            words: count({ ...value, topicId: null }),
          },
          ...(filters?.topics ?? []).map((topic) => ({
            value: topic.id,
            label: topic.nameVi ?? topic.name,
            words: count({ ...value, topicId: topic.id }),
          })),
        ]}
      />
      {state.loading && (
        <p className="game-word-filters-note" role="status">
          Đang tải trình độ và chủ đề…
        </p>
      )}
      {state.failed && (
        <div className="game-word-filters-note" role="alert">
          <p>
            Chưa tải được trình độ và chủ đề. Bạn vẫn có thể tiếp tục với lựa
            chọn hiện tại.
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
      {error && (
        <p className="game-word-filters-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
