import { useCallback, useMemo, useState } from 'react'
import { HttpError } from '@/lib/httpClient'
import {
  videoDictationApi,
  type DictationProgress,
  type DictationSegment,
  type DictationVideoDetail,
} from '../api/videoDictationApi'
import { MAX_ATTEMPTS, countWords, matchDictation, type DictationMatch } from '../lib/dictationMatch'
import type { SegmentPlayer } from './useYouTubeSegmentPlayer'

/**
 * ready    the video is cued; the learner presses play to hear the sentence
 * typing   the answer box is open, while the sentence plays and after it stops; the learner may replay it at will
 * wrong    the last answer missed the threshold and attempts are left
 * correct  the answer passed
 * revealed the attempts ran out; the sentence is shown
 * done     every sentence has been through
 *
 * Whether the sentence is playing right now is a separate flag (`playing`), so typing is never locked by playback.
 */
export type Phase = 'ready' | 'typing' | 'wrong' | 'correct' | 'revealed' | 'done'

export interface SegmentStat {
  attempts: number
  bestAccuracyPercent: number | null
  passed: boolean
}

export interface DictationSession {
  segments: DictationSegment[]
  index: number
  segment: DictationSegment
  phase: Phase
  /** The sentence is being played right now. */
  playing: boolean
  /** Going on from this sentence ends the exercise: it is the last one, or it was redone alone from the summary. */
  finishes: boolean
  text: string
  tries: number
  match: DictationMatch | null
  stats: Record<string, SegmentStat>
  passedCount: number
  /** Positions of the sentence's words the learner has uncovered as hints. */
  revealed: ReadonlySet<number>
  /** The learner has opened the Vietnamese meaning of the sentence. */
  meaningVisible: boolean
  busy: boolean
  notice: string | null
  setText: (value: string) => void
  start: () => void
  replay: () => void
  check: () => void
  retry: () => void
  next: () => void
  skip: () => void
  goTo: (index: number) => void
  redo: (index: number) => void
  restart: () => void
  /** Uncovers or covers one word of the sentence. */
  toggleWord: (position: number) => void
  /** Uncovers every word, or covers them all again when they are all uncovered already. */
  toggleAllWords: () => void
  toggleMeaning: () => void
}

function initialStats(segments: DictationSegment[], progress: DictationProgress): Record<string, SegmentStat> {
  const byId = new Map(progress.segments.map((segment) => [segment.segmentId, segment]))
  return Object.fromEntries(segments.map((segment) => {
    const known = byId.get(segment.id)
    return [segment.id, { attempts: known?.attempts ?? 0, bestAccuracyPercent: known?.bestAccuracyPercent ?? null, passed: known?.passed ?? false }]
  }))
}

export function useDictationSession(detail: DictationVideoDetail, progress: DictationProgress, player: SegmentPlayer): DictationSession {
  const segments = useMemo(() => [...detail.segments].sort((a, b) => a.sequenceNo - b.sequenceNo), [detail.segments])
  const initial = useMemo(() => initialStats(segments, progress), [segments, progress])
  const firstOpen = segments.findIndex((segment) => !initial[segment.id].passed)
  const [stats, setStats] = useState(initial)
  const [index, setIndex] = useState(Math.max(firstOpen, 0))
  const [phase, setPhase] = useState<Phase>(segments.length === 0 || firstOpen === -1 ? 'done' : 'ready')
  const [playing, setPlaying] = useState(false)
  const [text, setText] = useState('')
  const [tries, setTries] = useState(0)
  const [match, setMatch] = useState<DictationMatch | null>(null)
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set())
  const [meaningVisible, setMeaningVisible] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [redoOnly, setRedoOnly] = useState(false)

  const segment = segments[Math.min(index, Math.max(segments.length - 1, 0))]

  /** Plays sentence `at` from its start; the video pauses by itself at the end of the sentence. */
  const listen = useCallback((at: number) => {
    const target = segments[at]
    if (!target) return
    setPlaying(true)
    player.playSegment(target.startMs, target.endMs, () => setPlaying(false))
  }, [segments, player])

  /** `only` marks a single sentence redone from the summary: finishing it goes back to the summary. */
  const enter = useCallback((at: number, only = false) => {
    setRedoOnly(only)
    setIndex(at)
    setText('')
    setTries(0)
    setMatch(null)
    setRevealed(new Set())
    setMeaningVisible(false)
    setNotice(null)
    setPhase('typing')
    listen(at)
  }, [listen])

  const start = useCallback(() => {
    setPhase('typing')
    listen(index)
  }, [listen, index])

  /** As often as the learner wants, in any phase: the typed text and the result on screen stay as they are. */
  const replay = useCallback(() => listen(index), [listen, index])

  const check = useCallback(() => {
    if (phase !== 'typing' || busy || !text.trim() || !segment) return
    player.stop()
    setPlaying(false)
    const result = matchDictation(segment.transcript, text)
    const attempt = tries + 1
    setMatch(result)
    setTries(attempt)
    setStats((current) => {
      const before = current[segment.id]
      return {
        ...current,
        [segment.id]: {
          attempts: before.attempts + 1,
          bestAccuracyPercent: Math.max(before.bestAccuracyPercent ?? 0, result.accuracyPercent),
          passed: before.passed || result.correct,
        },
      }
    })
    setPhase(result.correct ? 'correct' : attempt >= MAX_ATTEMPTS ? 'revealed' : 'wrong')
    setBusy(true)
    setNotice(null)
    videoDictationApi
      .recordAttempt({ segmentId: segment.id, typedText: text.trim(), correct: result.correct, accuracyPercent: result.accuracyPercent })
      .catch((reason: unknown) => setNotice(reason instanceof HttpError ? 'Chưa lưu được kết quả lần này.' : 'Chưa lưu được kết quả lần này (mất kết nối).'))
      .finally(() => setBusy(false))
  }, [phase, busy, text, segment, tries, player])

  const retry = useCallback(() => setPhase('typing'), [])

  const advance = useCallback(() => {
    player.stop()
    setPlaying(false)
    if (redoOnly || index + 1 >= segments.length) setPhase('done')
    else enter(index + 1)
  }, [player, index, segments.length, enter, redoOnly])

  const goTo = useCallback((at: number) => {
    if (at >= 0 && at < segments.length) enter(at)
  }, [segments.length, enter])

  /** One sentence from the summary; the summary comes back when it is finished or skipped. */
  const redo = useCallback((at: number) => {
    if (at >= 0 && at < segments.length) enter(at, true)
  }, [segments.length, enter])

  const restart = useCallback(() => enter(0), [enter])

  const toggleWord = useCallback((position: number) => setRevealed((current) => {
    const next = new Set(current)
    if (!next.delete(position)) next.add(position)
    return next
  }), [])

  const toggleMeaning = useCallback(() => setMeaningVisible((value) => !value), [])

  const toggleAllWords = useCallback(() => {
    const total = countWords(segment?.transcript ?? '')
    setRevealed((current) => (current.size >= total ? new Set() : new Set(Array.from({ length: total }, (_, position) => position))))
  }, [segment])

  return {
    segments, index, segment, phase, playing, finishes: redoOnly || index + 1 >= segments.length, text, tries, match, stats,
    passedCount: Object.values(stats).filter((stat) => stat.passed).length,
    revealed, meaningVisible, busy, notice,
    setText, start, replay, check, retry, next: advance, skip: advance, goTo, redo, restart, toggleWord, toggleAllWords, toggleMeaning,
  }
}
