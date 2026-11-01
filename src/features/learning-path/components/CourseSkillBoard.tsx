import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowRight, Check, KeyRound, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/toast/toastContext'
import type { CourseSummary, CourseUnlockTarget, TopicSummary } from '~types/learningPath'
import {
  buildLanes,
  canUnlockCombo,
  canUnlockSkill,
  initialLaneKey,
  lockText,
  OTHER_LANE,
  type LaneKey,
  type LaneState,
  type SkillLane,
} from '../lib/courseSkills'
import { learningApi, toApiError } from '../api'
import { skillLabel } from '../lib/courseMeta'
import { reportApiError } from '../lib/reviewGate'
import { SKILL_ICON, skillHue } from '../lib/skillVisuals'
import { SegmentMeter } from './SegmentMeter'
import { TopicStop } from './TopicStop'
import { UnlockDialog } from './UnlockDialog'

const LANE_STATE_LABEL: Record<LaneState, string> = {
  SOON: 'Sắp ra mắt',
  READY: 'Chưa bắt đầu',
  IN_PROGRESS: 'Đang học',
  DONE: 'Hoàn thành',
}

function laneName(key: LaneKey) {
  return key === OTHER_LANE ? 'Khác' : skillLabel(key) ?? key
}

/** A skill with nothing in it yet is drawn in the neutral hue, so it reads as not available. */
function hueOf(lane: SkillLane) {
  return skillHue(lane.state === 'SOON' ? OTHER_LANE : lane.key)
}

function lanePercent(lane: SkillLane) {
  if (lane.state === 'DONE') return 100
  if (lane.totalLessons <= 0) return 0
  return Math.round(Math.min(1, lane.completedLessons / lane.totalLessons) * 100)
}

/**
 * The course as four skills. The rail picks a skill; the route beside it lists that skill's chặng, numbered inside the
 * skill, because progression is sequential only within one skill. `finish` is drawn under both as the end of the course.
 */
export function CourseSkillBoard({
  topics,
  course,
  finish = null,
  onUnlocked,
}: {
  topics: TopicSummary[]
  course: CourseSummary | null
  finish?: ReactNode
  onUnlocked: () => void
}) {
  const lanes = useMemo(() => buildLanes(topics), [topics])
  const [searchParams, setSearchParams] = useSearchParams()
  // A chặng named in `?topic=` (coming back from one of its lessons or tests) starts open. Without one, the chặng the
  // learner is on in the first skill shown starts open, so its lessons are in view; the rest start collapsed.
  const requestedTopic = searchParams.get('topic')
  const startKey = () => initialLaneKey(lanes, searchParams.get('skill'), requestedTopic)
  const [activeKey, setActiveKey] = useState<LaneKey>(startKey)
  const [openIds, setOpenIds] = useState<ReadonlySet<string>>(() => {
    const current = requestedTopic ?? lanes.find((lane) => lane.key === startKey())?.nextTopicId
    return new Set(current ? [current] : [])
  })
  const [unlockTarget, setUnlockTarget] = useState<CourseUnlockTarget | null>(null)
  const active = lanes.find((lane) => lane.key === activeKey) ?? lanes[0]

  function openTopic(topicId: string) {
    setOpenIds((current) => (current.has(topicId) ? current : new Set(current).add(topicId)))
  }

  function selectLane(key: LaneKey) {
    setActiveKey(key)
    const lane = lanes.find((row) => row.key === key)
    // Moving to a skill that has nothing open yet opens the chặng the learner is on there.
    if (lane?.nextTopicId && !lane.topics.some((topic) => openIds.has(topic.id))) openTopic(lane.nextTopicId)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set('skill', key)
      next.delete('topic')
      return next
    }, { replace: true })
  }

  function toggleTopic(topicId: string) {
    setOpenIds((current) => {
      const next = new Set(current)
      if (!next.delete(topicId)) next.add(topicId)
      return next
    })
  }

  const comboPrice = course?.comboPayablePoints ?? null

  return (
    <section className="lp-board" aria-labelledby="lp-board-title">
      <div className="lp-section__head">
        <h2 id="lp-board-title">Lộ trình theo kỹ năng</h2>
        <span className="lp-section__note">Học song song hoặc từng kỹ năng, tùy bạn.</span>
      </div>

      <div className="lp-board__grid">
        <div className="lp-board__rail">
          <div className="lp-skills" role="group" aria-label="Chọn kỹ năng">
            {lanes.map((lane, index) => (
              <SkillTile
                active={lane.key === active.key}
                index={index}
                key={lane.key}
                lane={lane}
                onSelect={() => selectLane(lane.key)}
              />
            ))}
          </div>
          {canUnlockCombo(course) ? (
            <button className="lp-board__combo" onClick={() => setUnlockTarget('COMBO')} type="button">
              <KeyRound aria-hidden="true" size={15} />
              Mở cả 4 kỹ năng · {comboPrice?.toLocaleString('vi-VN')} Points
            </button>
          ) : null}
        </div>

        <section
          aria-labelledby={`lp-lane-${active.key}-title`}
          className="lp-lane"
          id="lp-lane-panel"
          key={active.key}
          style={{ '--hue': hueOf(active) } as CSSProperties}
        >
          <LaneHead
            lane={active}
            onOpenTopic={openTopic}
            onUnlock={() => setUnlockTarget(active.key as CourseUnlockTarget)}
            unlockable={canUnlockSkill(course, active.key)}
            unlockPrice={active.key === OTHER_LANE ? undefined : course?.skillUnlockPoints?.[active.key]}
          />

          {active.topics.length === 0 ? (
            <p className="lp-empty lp-lane__empty">
              {active.key === 'SPEAKING'
                ? 'Speaking sắp ra mắt. Bạn vẫn học đầy đủ ba kỹ năng còn lại.'
                : `Khóa này chưa có chặng ${laneName(active.key)}.`}
            </p>
          ) : (
            <ol className="lp-route" aria-label={`Các chặng ${laneName(active.key)}`}>
              {active.topics.map((topic, index) => {
                const prev = active.topics[index - 1]
                const repeatsReason = topic.status === 'LOCKED' && prev?.status === 'LOCKED' && lockText(prev) === lockText(topic)
                return (
                  <TopicStop
                    index={index}
                    isNext={topic.id === active.nextTopicId}
                    key={topic.id}
                    number={index + 1}
                    onToggle={() => toggleTopic(topic.id)}
                    open={openIds.has(topic.id)}
                    quietReason={repeatsReason}
                    topic={topic}
                  />
                )
              })}
            </ol>
          )}
        </section>
      </div>

      {finish ? <ol className="lp-route lp-board__finish" aria-label="Về đích">{finish}</ol> : null}

      {unlockTarget && course ? (
        <UnlockDialog
          courseId={course.id}
          onChanged={() => {
            setUnlockTarget(null)
            onUnlocked()
          }}
          onClose={() => setUnlockTarget(null)}
          target={unlockTarget}
        />
      ) : null}
    </section>
  )
}

function SkillTile({
  lane,
  active,
  index,
  onSelect,
}: {
  lane: SkillLane
  active: boolean
  index: number
  onSelect: () => void
}) {
  const Icon = SKILL_ICON[lane.key]
  const percent = lanePercent(lane)
  const soon = lane.state === 'SOON'
  return (
    <button
      aria-pressed={active}
      aria-controls="lp-lane-panel"
      className={`lp-skill lp-skill--${lane.state.toLowerCase()}${active ? ' is-active' : ''}`}
      onClick={onSelect}
      style={{ '--i': index, '--p': percent, '--hue': hueOf(lane) } as CSSProperties}
      type="button"
    >
      <span className="lp-skill__ring" aria-hidden="true">
        <Icon size={20} strokeWidth={2.1} />
        {lane.state === 'DONE' ? <span className="lp-skill__tick"><Check size={11} strokeWidth={3.2} /></span> : null}
      </span>
      <span className="lp-skill__text">
        <strong>{laneName(lane.key)}</strong>
        <span>
          {soon ? LANE_STATE_LABEL.SOON : `${lane.completedLessons}/${lane.totalLessons} bài`}
        </span>
      </span>
      {soon ? null : <span className="lp-sr-only">{LANE_STATE_LABEL[lane.state]}</span>}
    </button>
  )
}

function LaneHead({
  lane,
  unlockable,
  unlockPrice,
  onUnlock,
  onOpenTopic,
}: {
  lane: SkillLane
  unlockable: boolean
  unlockPrice: number | undefined
  onUnlock: () => void
  onOpenTopic: (topicId: string) => void
}) {
  const Icon = SKILL_ICON[lane.key]
  return (
    <header className="lp-lane__head">
      <span className="lp-lane__icon" aria-hidden="true"><Icon size={22} strokeWidth={2.1} /></span>
      <div className="lp-lane__title">
        <p className="lp-eyebrow">
          {LANE_STATE_LABEL[lane.state]}
          {lane.topics.length > 0 ? ` · ${lane.passedTopics}/${lane.topics.length} chặng` : ''}
        </p>
        <h3 id={`lp-lane-${lane.key}-title`}>{laneName(lane.key)}</h3>
      </div>
      {lane.topics.length > 0 ? (
        <div className="lp-lane__meter">
          <SegmentMeter done={lane.passedTopics} total={lane.topics.length} unit="chặng" />
          <span>{lane.completedLessons}/{lane.totalLessons} bài</span>
        </div>
      ) : null}
      {lane.nextTopicId || unlockable ? (
        <div className="lp-lane__actions">
          {lane.nextTopicId ? (
            <ContinueButton fresh={lane.state === 'READY'} onOpenTopic={onOpenTopic} topicId={lane.nextTopicId} />
          ) : null}
          {unlockable ? (
            <Button className="lp-lane__unlock" onClick={onUnlock} type="button" variant="outline">
              <KeyRound aria-hidden="true" size={15} />
              Mở khóa{unlockPrice != null ? ` · ${unlockPrice.toLocaleString('vi-VN')} Points` : ''}
            </Button>
          ) : null}
        </div>
      ) : null}
    </header>
  )
}

/** Jumps to the next open lesson of the chặng the learner is on, so nobody has to hunt for it among dozens of lessons. */
function ContinueButton({ topicId, fresh, onOpenTopic }: { topicId: string; fresh: boolean; onOpenTopic: (topicId: string) => void }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [busy, setBusy] = useState(false)

  async function go() {
    setBusy(true)
    try {
      const { lessons } = await learningApi.getTopicLessons(topicId)
      const next = lessons.slice().sort((a, b) => a.sortOrder - b.sortOrder).find((lesson) => lesson.status === 'AVAILABLE')
      if (next) navigate(`/learn/lessons/${next.id}`)
      else onOpenTopic(topicId)
    } catch (reason) {
      const error = toApiError(reason)
      reportApiError(error)
      toast({ title: `${error.message} Hãy thử lại.`, tone: 'error' })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button className="lp-btn lp-btn--accent lp-lane__continue" disabled={busy} onClick={() => void go()} type="button">
      {busy ? <Loader2 aria-hidden="true" className="lp-spin" size={16} /> : null}
      {fresh ? 'Bắt đầu học' : 'Học tiếp'}
      {busy ? null : <ArrowRight aria-hidden="true" size={16} />}
    </Button>
  )
}
