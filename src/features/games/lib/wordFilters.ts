import { useCallback, useEffect, useState } from 'react'
import { gameApi } from '../api/gameApi'
import type { RoomSettings, WordFilter, WordFilters } from '../types/game'

export const CEFR_LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const
export const ANY_WORDS: WordFilter = { cefrLevel: null, topicId: null }
export const WORDLY_ENDLESS_MIN_WORDS = 5

export function roomWordFilter(settings?: RoomSettings | null): WordFilter {
  return {
    cefrLevel: settings?.cefrLevel ?? null,
    topicId: settings?.topicId ?? null,
  }
}

/** Words a Wordly match needs: the word limit, or the minimum for endless mode. */
export function wordlyRequiredWords(wordLimit: number | null) {
  return wordLimit ?? WORDLY_ENDLESS_MIN_WORDS
}

/** Words the catalog holds for a choice; null level or topic reads the total row. Missing rows hold no words. */
export function availableWords(filters: WordFilters, choice: WordFilter) {
  return (
    filters.availability.find(
      (row) =>
        row.cefrLevel === choice.cefrLevel && row.topicId === choice.topicId,
    )?.words ?? 0
  )
}

/** Text for a choice with too few words, or null when it is playable or the counts are not loaded. */
export function wordFilterError(
  filters: WordFilters | null,
  choice: WordFilter,
  required: number,
) {
  if (!filters) return null
  const available = availableWords(filters, choice)
  return available >= required
    ? null
    : `Lựa chọn này chỉ có ${available} từ, cần ${required} từ. Hãy đổi lựa chọn hoặc giảm số từ.`
}

/** "B1 · Môi trường"; a topic missing from the list, or a list that has not loaded, gets a generic name. */
export function wordFilterLabel(
  choice: WordFilter,
  filters: WordFilters | null,
) {
  const topic = filters?.topics.find((item) => item.id === choice.topicId)
  const topicName = !choice.topicId
    ? 'Mọi chủ đề'
    : (topic?.nameVi ?? topic?.name ?? 'Chủ đề đã chọn')
  return `${choice.cefrLevel ?? 'Mọi trình độ'} · ${topicName}`
}

export type WordFiltersState = {
  filters: WordFilters | null
  loading: boolean
  failed: boolean
  retry: () => void
}

export function useWordFilters(enabled = true): WordFiltersState {
  const [attempt, setAttempt] = useState(0)
  const [filters, setFilters] = useState<WordFilters | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    if (!enabled) return
    const controller = new AbortController()
    gameApi
      .wordFilters(controller.signal)
      .then((result) => {
        if (controller.signal.aborted) return
        setFilters(result)
        setFailed(false)
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true)
      })
    return () => controller.abort()
  }, [enabled, attempt])
  const retry = useCallback(() => {
    setFailed(false)
    setAttempt((value) => value + 1)
  }, [])
  return { filters, loading: enabled && !filters && !failed, failed, retry }
}
