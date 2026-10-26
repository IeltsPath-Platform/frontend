import { describe, expect, it } from 'vitest'
import type { Badge, DailyQuests, GamificationSummary, Quest, Suggestion } from '~types/learningPath'
import { buildAnnouncements, buildOwlMessages, buildSuggestionReminder, type OwlSnapshot } from './owl-messages'

const quest = (over: Partial<Quest>): Quest => ({
  type: 'PRACTICE', required: 5, progress: 0, completed: false, xpReward: 20, pointsReward: 0, target: null, ...over,
})
const daily = (quests: Quest[]): DailyQuests => ({
  date: '2026-10-20', completed: quests.filter((q) => q.completed).length, quests,
})
const badge = (over: Partial<Badge>): Badge => ({
  code: 'B', name: 'Chuỗi 7 ngày', description: '', rewardPoints: 5, awarded: false, awardedAt: null, progress: null, ...over,
})

describe('buildOwlMessages', () => {
  it('announces the quests of the day when none is started', () => {
    const [message] = buildOwlMessages(daily([quest({}), quest({ type: 'PRACTICE_PLUS', required: 10 }), quest({ type: 'STREAK', required: 1 })]), [])
    expect(message.text).toBe('Hôm nay bạn có 3 nhiệm vụ. Bắt đầu với “Làm 5 câu trắc nghiệm” nhé!')
  })

  it('points at the pending quest closest to done', () => {
    const [message] = buildOwlMessages(daily([
      quest({ completed: true, progress: 5 }),
      quest({ type: 'PRACTICE_PLUS', required: 10, progress: 2 }),
      quest({ type: 'STREAK', required: 4, progress: 3 }),
    ]), [])
    expect(message.text).toContain('Còn 2/3 nhiệm vụ hôm nay')
    expect(message.text).toContain('(3/4)')
  })

  it('cheers when every quest is done', () => {
    const [message] = buildOwlMessages(daily([quest({ completed: true }), quest({ completed: true })]), [])
    expect(message.mood).toBe('celebrate')
  })

  it('mentions only badges that are about to unlock, nearest first', () => {
    const messages = buildOwlMessages(null, [
      badge({ code: 'far', name: 'Xa', progress: { current: 1, target: 100 } }),
      badge({ code: 'half', name: 'Một nửa', progress: { current: 5, target: 10 } }),
      badge({ code: 'near', name: 'Gần xong', progress: { current: 28, target: 30 } }),
      badge({ code: 'few', name: 'Còn ít', progress: { current: 97, target: 100 } }),
      badge({ code: 'held', name: 'Đã có', awarded: true, progress: { current: 10, target: 10 } }),
    ])
    expect(messages.map((m) => m.id)).toEqual(['badge-few', 'badge-near'])
    expect(messages[0].text).toBe('Sắp mở khóa huy hiệu “Còn ít”: chỉ còn 3 nữa (97/100)!')
  })

  it('says nothing when there is nothing to report', () => {
    expect(buildOwlMessages(null, null)).toEqual([])
    expect(buildOwlMessages(daily([]), [badge({ progress: { current: 1, target: 7 } })])).toEqual([])
  })
})

const suggestion = (title: string): Suggestion => ({
  type: 'PRACTICE_SET', id: title, title, knowledgePointId: 'kp', knowledgePointCode: null, reason: 'CONSOLIDATE',
  band: 5.5, skill: 'READING', action: { kind: 'BASKET_REVIEW', knowledgePointId: 'kp' },
})

describe('buildSuggestionReminder', () => {
  it('says nothing when there is nothing to suggest', () => {
    expect(buildSuggestionReminder([])).toBeNull()
  })

  it('counts the suggestions and starts with the first one', () => {
    const message = buildSuggestionReminder([suggestion('Câu chủ đề'), suggestion('Ý chính'), suggestion('Từ nối')])
    expect(message?.text).toBe('Hôm nay có 3 việc nhỏ giúp bạn chắc hơn. Bắt đầu với “Câu chủ đề” nhé?')
    expect(message?.tab).toBe('suggestions')
    expect(message?.mood).toBe('info')
  })

  it('names the only suggestion instead of counting', () => {
    expect(buildSuggestionReminder([suggestion('Câu chủ đề')])?.text)
      .toBe('Hôm nay có 1 việc nhỏ giúp bạn chắc hơn: “Câu chủ đề”. Xem thử nhé?')
  })
})

const summary = (over: Partial<GamificationSummary> = {}): GamificationSummary => ({
  xpEarned: 10, xpCapped: false, totalXp: 100, level: 3, leveledUp: false, heartsLost: null, heartsRemaining: null, nextHeartAt: null, ...over,
})
const snap = (over: Partial<OwlSnapshot>): OwlSnapshot => ({ progress: null, hearts: null, quests: null, badges: null, ...over })

describe('buildAnnouncements', () => {
  it('has nothing to say when nothing changed', () => {
    const before = snap({ quests: daily([quest({})]), badges: [badge({})] })
    expect(buildAnnouncements(before, before, summary())).toEqual([])
  })

  it('announces a level-up first, then a new badge, then a finished quest', () => {
    const before = snap({
      quests: daily([quest({ progress: 4 }), quest({ type: 'STREAK', required: 1 })]),
      badges: [badge({ code: 'L5', name: 'Cấp 5', progress: { current: 4, target: 5 } })],
    })
    const after = snap({
      quests: daily([quest({ progress: 5, completed: true }), quest({ type: 'STREAK', required: 1 })]),
      badges: [badge({ code: 'L5', name: 'Cấp 5', awarded: true, rewardPoints: 20, progress: { current: 5, target: 5 } })],
    })
    const news = buildAnnouncements(before, after, summary({ leveledUp: true, level: 5 }))
    expect(news.map((m) => m.id)).toEqual(['level-5', 'badge-earned-L5', 'quest-done-PRACTICE'])
    expect(news[1].text).toBe('Bạn vừa nhận huy hiệu “Cấp 5”! (+20 điểm)')
  })

  it('does not repeat quests and badges that were already done', () => {
    const state = snap({ quests: daily([quest({ completed: true, progress: 5 })]), badges: [badge({ awarded: true })] })
    expect(buildAnnouncements(state, state, summary())).toEqual([])
  })

  it('cheers once when the last quest of the day is finished', () => {
    const before = snap({ quests: daily([quest({ completed: true }), quest({ type: 'STREAK', required: 1 })]) })
    const after = snap({ quests: daily([quest({ completed: true }), quest({ type: 'STREAK', required: 1, completed: true })]) })
    expect(buildAnnouncements(before, after, summary()).map((m) => m.id)).toEqual(['quests-all-done'])
  })

  it('does not compare quests across two days', () => {
    const before = snap({ quests: { ...daily([quest({})]), date: '2026-10-19' } })
    const after = snap({ quests: daily([quest({ completed: true })]) })
    expect(buildAnnouncements(before, after, summary())).toEqual([])
  })

  it('warns about hearts only when one or none is left', () => {
    const empty = snap({})
    expect(buildAnnouncements(empty, empty, summary({ heartsLost: 1, heartsRemaining: 3 }))).toEqual([])
    const [one] = buildAnnouncements(empty, empty, summary({ heartsLost: 1, heartsRemaining: 1 }))
    expect(one.mood).toBe('warn')
    const [none] = buildAnnouncements(empty, empty, summary({ heartsLost: 1, heartsRemaining: 0 }))
    expect(none.text).toContain('Hết tim')
  })

  it('skips what it could not load before the submission', () => {
    const after = snap({ badges: [badge({ awarded: true })], quests: daily([quest({ completed: true })]) })
    expect(buildAnnouncements(snap({}), after, summary())).toEqual([])
  })
})
