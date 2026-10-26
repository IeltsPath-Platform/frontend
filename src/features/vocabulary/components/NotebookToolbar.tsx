import { Search, LayoutGrid, List as ListIcon, X, Filter } from 'lucide-react'
import type { UnderstandingLevel } from '../lib/understanding'
import { UNDERSTANDING_LEVELS, ALL_LEVELS } from '../lib/understanding'
import type { NotebookSort, NotebookSummaryResponse } from '../api/notebookApi'

interface NotebookToolbarProps {
  searchQuery: string
  onSearchChange: (q: string) => void
  selectedLevels: UnderstandingLevel[]
  onLevelToggle: (level: UnderstandingLevel) => void
  onClearLevels: () => void
  isDueOnly: boolean
  onDueToggle: () => void
  sort: NotebookSort
  onSortChange: (sort: NotebookSort) => void
  viewMode: 'grid' | 'list'
  onViewModeChange: (mode: 'grid' | 'list') => void
  summary: NotebookSummaryResponse | null
}

const SORT_LABELS: Record<NotebookSort, string> = {
  RECENT: 'Mới lưu gần đây',
  DUE: 'Đến hạn ôn trước',
  ALPHABET: 'Thứ tự A–Z',
  WEAKEST: 'Từ cần củng cố nhất',
}

export function NotebookToolbar({
  searchQuery,
  onSearchChange,
  selectedLevels,
  onLevelToggle,
  onClearLevels,
  isDueOnly,
  onDueToggle,
  sort,
  onSortChange,
  viewMode,
  onViewModeChange,
  summary,
}: NotebookToolbarProps) {
  const isAllSelected = selectedLevels.length === 0

  return (
    <div className="vocab-toolbar" role="search" aria-label="Bộ lọc và tìm kiếm sổ từ">
      <div className="vocab-toolbar__top">
        <div className="vocab-search-wrap">
          <Search size={18} className="vocab-search-icon" aria-hidden="true" />
          <input
            type="text"
            className="vocab-search-input"
            placeholder="Tìm từ, nghĩa tiếng Việt hoặc câu ví dụ..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Tìm kiếm trong sổ từ vựng"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              style={{
                position: 'absolute',
                right: '0.75rem',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#77808e',
              }}
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label htmlFor="vocab-sort-select" className="sr-only">
            Sắp xếp theo
          </label>
          <select
            id="vocab-sort-select"
            value={sort}
            onChange={(e) => onSortChange(e.target.value as NotebookSort)}
            style={{
              padding: '0.5rem 0.85rem',
              borderRadius: '0.65rem',
              border: '1px solid var(--classroom-border, #e3e7ef)',
              background: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--classroom-text, #202633)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {(Object.keys(SORT_LABELS) as NotebookSort[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABELS[key]}
              </option>
            ))}
          </select>

          <div
            style={{
              display: 'inline-flex',
              border: '1px solid var(--classroom-border, #e3e7ef)',
              borderRadius: '0.65rem',
              overflow: 'hidden',
            }}
          >
            <button
              type="button"
              onClick={() => onViewModeChange('grid')}
              aria-label="Xem dạng lưới"
              aria-pressed={viewMode === 'grid'}
              style={{
                padding: '0.45rem 0.65rem',
                border: 'none',
                background: viewMode === 'grid' ? '#eef3ff' : '#ffffff',
                color: viewMode === 'grid' ? 'var(--classroom-primary, #123ab5)' : '#77808e',
                cursor: 'pointer',
              }}
            >
              <LayoutGrid size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('list')}
              aria-label="Xem dạng danh sách"
              aria-pressed={viewMode === 'list'}
              style={{
                padding: '0.45rem 0.65rem',
                border: 'none',
                background: viewMode === 'list' ? '#eef3ff' : '#ffffff',
                color: viewMode === 'list' ? 'var(--classroom-primary, #123ab5)' : '#77808e',
                cursor: 'pointer',
              }}
            >
              <ListIcon size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <div className="vocab-toolbar__filters">
        <button
          type="button"
          className={`vocab-chip ${isAllSelected ? 'is-active' : ''}`}
          onClick={onClearLevels}
        >
          Tất cả mức độ
          {summary && <span className="vocab-chip__badge">{summary.total}</span>}
        </button>

        {ALL_LEVELS.map((lvl) => {
          const config = UNDERSTANDING_LEVELS[lvl]
          const isSelected = selectedLevels.includes(lvl)
          const count = summary?.byLevel[lvl] ?? 0
          return (
            <button
              key={lvl}
              type="button"
              className={`vocab-chip ${isSelected ? 'is-active' : ''}`}
              onClick={() => onLevelToggle(lvl)}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: isSelected ? 'white' : config.color,
                  display: 'inline-block',
                }}
                aria-hidden="true"
              />
              {config.label}
              <span className="vocab-chip__badge">{count}</span>
            </button>
          )
        })}

        <button
          type="button"
          className={`vocab-chip ${isDueOnly ? 'is-active' : ''}`}
          onClick={onDueToggle}
          style={{ marginLeft: 'auto' }}
        >
          <Filter size={14} aria-hidden="true" />
          Chỉ hiện từ đến hạn ôn
          {summary && summary.dueNow > 0 && (
            <span
              className="vocab-chip__badge"
              style={{ background: isDueOnly ? 'rgba(255,255,255,0.3)' : '#fee2e2', color: isDueOnly ? 'white' : '#b91c1c' }}
            >
              {summary.dueNow}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}

