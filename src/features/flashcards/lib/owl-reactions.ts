import type { OwlHeroMotion } from '@/components/OwlHero'
import type { OwlPose } from '@/components/owlPoses'
import type { AnswerKind } from './answer-feedback'

/**
 * Visual effect played around the owl with a reaction:
 * `stars` burst on a correct answer, `confetti`/`fire` for streaks and finishes, `hearts` for a card finally learned,
 * `idea` (light bulb) for near misses, `question` for mixed-up words, `shake` for a miss, `sweat` for a card missed
 * again, `wave` for gentle nudges and `zzz` for a break reminder.
 */
export type OwlEffect = 'stars' | 'confetti' | 'fire' | 'hearts' | 'idea' | 'question' | 'shake' | 'sweat' | 'wave' | 'zzz'

export interface OwlReaction {
  pose: OwlPose
  motion: OwlHeroMotion
  text: string
  tone: 'success' | 'warning' | 'info'
  celebrateKey?: string | number | null
  effect?: OwlEffect
}

/** Picks an item from candidates ensuring it does not repeat the previous message if possible. */
export function pickNonRepeating(
  candidates: readonly string[],
  previousText?: string | null,
  random: () => number = Math.random
): string {
  const filtered = previousText ? candidates.filter((item) => item !== previousText) : candidates
  const pool = filtered.length > 0 ? filtered : candidates
  const index = Math.floor(random() * pool.length)
  return pool[index]
}

export interface AnswerReactionOptions {
  kind: AnswerKind
  expected: string
  given?: string
  streak?: number
  wrongCount?: number
  previouslyFailed?: boolean
  mixedUpWith?: string
  previousText?: string | null
  random?: () => number
}

const CORRECT_REGULAR = [
  'Chuẩn luôn!',
  'Bạn nhớ tốt quá!',
  'Chính xác tuyệt đối!',
  'Rất xuất sắc!',
  'Cứ thế phát huy nhé!',
  'Đúng rồi, trí nhớ siêu ghê!',
  'Quá chuẩn, tiếp tục nào! 💪',
  'Hay lắm, từ này bạn nắm chắc rồi!',
  'Ghi điểm! Cú tự hào về bạn đó!',
  'Tuyệt cú mèo, à không, tuyệt cú vọ! 🦉',
]

const CORRECT_STREAK_3 = [
  '3 câu liền mạch, quá đỉnh!',
  'Chuỗi 3 câu đúng rồi, siêu quá!',
  'Giữ vững phong độ 3 câu liên tiếp nhé!',
  'Đỉnh chóp! 3 câu không trượt phát nào!',
  '3 câu đúng liền, bắn pháo hoa thôi! 🎉',
  'Combo 3 câu! Bạn đang vào guồng rồi đó!',
]

const CORRECT_STREAK_5 = [
  'Phong độ cao thủ, giữ vững nhé!',
  '5 câu liên tiếp chuẩn xác, quá cừ!',
  'Bất khả chiến bại, tiếp tục nào!',
  'Tập trung đỉnh cao luôn bạn ơi!',
  'Chuỗi đúng đang cháy rực, đừng dừng lại! 🔥',
  'Cú phải đeo kính râm vì bạn chói quá! 😎',
  'Như máy luôn! IELTS chắc chắn nằm trong tầm tay!',
  'Không ai cản nổi bạn hôm nay!',
]

const CORRECT_RECOVERED = [
  'Lần này nhớ rồi đó, tiến bộ rõ!',
  'Khắc phục chuẩn xác rồi, hay lắm!',
  'Ôn lại là nhớ ngay, tuyệt vời!',
  'Đã nhớ được từ khó rồi nhé!',
  'Thấy chưa, sai một lần là nhớ mãi! ❤️',
  'Từ khó đã bị bạn chinh phục, tiến bộ quá!',
  'Lần trước trượt, lần này trúng. Đó là tiến bộ!',
]

const ACCENT_RESPONSES = [
  'Chỉ thiếu dấu thôi, gần đúng rồi!',
  'Gần chuẩn rồi, chỉ chú ý dấu chút xíu nhé!',
  'Suýt trúng, bạn nhớ thêm dấu nhé!',
  'Sai một chút dấu thôi, bạn nhớ rất siêu rồi!',
  'Đúng mặt chữ rồi, chỉ cần soát lại dấu thôi!',
  'Từ thì đúng rồi, dấu hơi lệch một xíu!',
]

const BLANK_RESPONSES = [
  'Không sao, xem đáp án rồi mình ôn lại nhé.',
  'Đừng lo, nhìn lại từ này một lần là nhớ ngay.',
  'Chưa nhớ cũng không sao, chúng mình cùng ôn lại!',
  'Bình tĩnh nha, xem đáp án rồi thử lại sau nhé.',
  'Biết mình chưa biết cũng là một bước tiến đó!',
  'Thẻ này sẽ quay lại, lần sau bạn sẽ nhớ thôi.',
  'Đọc to đáp án một lần, não sẽ ghi nhớ tốt hơn.',
]

const WRONG_FIRST = [
  'Chưa đúng, nhưng thẻ này sẽ quay lại để bạn thử tiếp.',
  'Hơi nhầm một chút, lát nữa thử lại sẽ nhớ!',
  'Chưa chính xác, cùng xem lại đáp án nhé.',
  'Không sao cả, sai để nhớ lâu hơn!',
  'Trượt nhẹ thôi, cú tin lần sau bạn làm được!',
  'Sai là cách não học nhanh nhất đó, đừng ngại!',
  'Ghi nhớ đáp án nhé, thẻ này sẽ gặp lại sớm thôi.',
]

const WRONG_REPEATED = [
  'Từ này hơi khó nhằn, thử đặt một câu ví dụ để nhớ nhé.',
  'Từ này hơi mẹo một chút, ghi chú lại vào giấy nha!',
  'Đừng nản, từ khó càng giúp mình nhớ dai hơn.',
  'Thử nhẩm lại từ này vài lần để khắc sâu nhé.',
  'Mẹo nhỏ: liên tưởng từ này với một hình ảnh vui.',
  'Thử chia từ thành từng phần nhỏ để nhớ dễ hơn nha.',
  'Từ này lì thật, nhưng bạn còn lì hơn mà! 💪',
]

export function getAnswerReaction({
  kind,
  expected,
  streak = 0,
  wrongCount = 0,
  previouslyFailed = false,
  mixedUpWith,
  previousText,
  random = Math.random,
}: AnswerReactionOptions): OwlReaction {
  if (kind === 'correct') {
    if (previouslyFailed) {
      return { pose: 'confident', motion: 'hop', effect: 'hearts', tone: 'success', text: pickNonRepeating(CORRECT_RECOVERED, previousText, random) }
    }
    if (streak >= 5) {
      return {
        pose: 'cool', motion: 'hop', effect: 'fire', tone: 'success',
        // Every fifth answer in a run gets confetti too, so long streaks keep being celebrated.
        celebrateKey: streak % 5 === 0 ? `streak-${streak}-${Math.floor(random() * 10000)}` : null,
        text: pickNonRepeating(CORRECT_STREAK_5, previousText, random),
      }
    }
    if (streak === 3) {
      return {
        pose: 'party', motion: 'hop', effect: 'confetti', tone: 'success',
        celebrateKey: `streak-${streak}-${Math.floor(random() * 10000)}`,
        text: pickNonRepeating(CORRECT_STREAK_3, previousText, random),
      }
    }
    return { pose: random() > 0.5 ? 'cheer' : 'confident', motion: 'hop', effect: 'stars', tone: 'success', text: pickNonRepeating(CORRECT_REGULAR, previousText, random) }
  }

  if (kind === 'accent') {
    return { pose: 'idea', motion: 'calm', effect: 'idea', tone: 'warning', text: pickNonRepeating(ACCENT_RESPONSES, previousText, random) }
  }

  if (kind === 'typo') {
    const typoPool = [
      `Suýt nữa! Kiểm tra lại chính tả: ${expected}`,
      `Gần trúng rồi! Để ý chính tả một chút nha: ${expected}`,
      `Chỉ lệch một hai chữ thôi, đáp án đúng: ${expected}`,
      `Rất gần rồi! Chú ý mặt chữ nhé: ${expected}`,
      `Chỉ một lỗi gõ nhỏ thôi! Viết đúng là: ${expected}`,
      `Bạn nhớ đúng từ rồi, chỉ cần soát chính tả: ${expected}`,
    ]
    return { pose: 'idea', motion: 'calm', effect: 'idea', tone: 'warning', text: pickNonRepeating(typoPool, previousText, random) }
  }

  if (kind === 'mixed-up') {
    const mixedPool = mixedUpWith
      ? [
          `Bạn đang nhầm với ${mixedUpWith} rồi. Hai từ này dễ lẫn lắm!`,
          `Hơi nhầm sang ${mixedUpWith} rồi, để ý phân biệt nha!`,
          `Coi chừng bị lẫn với ${mixedUpWith} nhé bạn!`,
          `Đó là nghĩa của ${mixedUpWith}! So sánh hai từ một chút nhé.`,
          'Hai từ này dễ lẫn lắm, cùng xem lại nhé!',
        ]
      : [
          'Bạn đang nhầm sang một từ khác rồi. Hai từ này dễ lẫn lắm!',
          'Coi chừng bị lẫn sang từ khác nhé!',
          'Hơi nhầm sang từ khác rồi, để ý phân biệt nha!',
          'Hai từ này dễ lẫn lắm, cùng xem lại nhé!',
        ]
    return { pose: 'confused', motion: 'calm', effect: 'question', tone: 'warning', text: pickNonRepeating(mixedPool, previousText, random) }
  }

  if (kind === 'blank') {
    return { pose: random() > 0.5 ? 'wave' : 'desk', motion: 'calm', effect: 'wave', tone: 'info', text: pickNonRepeating(BLANK_RESPONSES, previousText, random) }
  }

  if (wrongCount >= 2) {
    return { pose: 'tired', motion: 'calm', effect: 'sweat', tone: 'info', text: pickNonRepeating(WRONG_REPEATED, previousText, random) }
  }
  return { pose: 'confused', motion: 'calm', effect: 'shake', tone: 'info', text: pickNonRepeating(WRONG_FIRST, previousText, random) }
}

const GREETINGS = [
  'Chào bạn! Cùng chinh phục {n} thẻ này nhé! 🦉',
  'Sẵn sàng chưa? {n} thẻ đang chờ bạn đó!',
  'Bắt đầu thôi! Cú sẽ đồng hành cùng bạn qua {n} thẻ.',
  'Hít thở sâu, tập trung nào. Có {n} thẻ cần học!',
]

/** Said once when a Learn session starts. */
export function getGreetingReaction(total: number, random: () => number = Math.random): OwlReaction {
  return { pose: 'wave', motion: 'walk', effect: 'wave', tone: 'info', text: pickNonRepeating(GREETINGS, null, random).replace('{n}', String(total)) }
}

/**
 * Progress milestones (25/50/75% mastered, two cards left). Returns a reaction only when `after` crosses a
 * milestone that `before` had not, so each milestone is said once.
 */
export function getMilestoneReaction(before: number, after: number, total: number, random: () => number = Math.random): OwlReaction | null {
  if (total < 4 || after <= before || after >= total) return null
  const left = total - after
  if (left === 2 && total - before > 2) {
    return { pose: 'cheer', motion: 'hop', effect: 'stars', tone: 'success', text: pickNonRepeating(['Chỉ còn 2 thẻ nữa thôi, về đích nào! 🏁', 'Sắp xong rồi, còn đúng 2 thẻ!'], null, random) }
  }
  const crossed = [0.75, 0.5, 0.25].find((mark) => before / total < mark && after / total >= mark)
  if (!crossed) return null
  const lines: Record<number, string[]> = {
    0.25: ['Đã thuộc 1/4 bộ thẻ rồi, khởi đầu tuyệt vời!', 'Xong 25% rồi đó, cứ đều đều thế này nhé!'],
    0.5: ['Nửa chặng đường rồi! Bạn làm tốt lắm! 🎯', 'Đã thuộc một nửa bộ thẻ, quá đỉnh!'],
    0.75: ['75% rồi! Về đích tới nơi rồi bạn ơi!', 'Chỉ còn 1/4 nữa thôi, cố lên!'],
  }
  return { pose: crossed === 0.5 ? 'party' : 'confident', motion: 'hop', effect: crossed === 0.5 ? 'confetti' : 'stars', tone: 'success', celebrateKey: crossed === 0.5 ? `half-${after}` : null, text: pickNonRepeating(lines[crossed], null, random) }
}

const IDLE_CHOICE = [
  'Đang phân vân à? Thử loại trừ các đáp án chắc chắn sai trước nhé.',
  'Nghĩ lại xem từ này hay xuất hiện trong ngữ cảnh nào?',
  'Đừng ngại chọn, sai cũng giúp bạn nhớ lâu hơn mà!',
]

/**
 * Nudge after the learner sits on a question. The second nudge on a typed question gives the first letter as a hint;
 * later nudges keep encouraging without giving more away.
 */
export function getIdleReminder(stage: 'choice' | 'typed', expected: string, nudge: number, random: () => number = Math.random): OwlReaction {
  if (stage === 'typed' && nudge >= 2) {
    const first = expected.trim().charAt(0)
    return { pose: 'idea', motion: 'calm', effect: 'idea', tone: 'warning', text: `Gợi ý nhỏ: từ này bắt đầu bằng chữ “${first}” và có ${expected.trim().length} ký tự.` }
  }
  const typed = [
    'Thử gõ những chữ bạn nhớ được trước nhé, đừng sợ sai!',
    'Đọc lại định nghĩa thật chậm, từ khóa sẽ hiện ra thôi.',
    'Không nhớ ra? Bấm “Không biết?” để xem đáp án cũng được nha.',
  ]
  return { pose: 'desk', motion: 'calm', effect: 'wave', tone: 'info', text: pickNonRepeating(stage === 'typed' ? typed : IDLE_CHOICE, null, random) }
}

/** After three misses in a row the owl suggests a short pause instead of more pressure. */
export function getWrongStreakReminder(wrongStreak: number, random: () => number = Math.random): OwlReaction | null {
  if (wrongStreak < 3) return null
  const lines = [
    'Sai liền mấy câu rồi, nghỉ 30 giây hít thở rồi quay lại nhé.',
    'Đầu óc cần nghỉ chút xíu đó. Uống ngụm nước rồi học tiếp nha!',
    'Chậm lại một chút cũng không sao, đọc kỹ từng câu nhé.',
  ]
  return { pose: 'tired', motion: 'calm', effect: 'zzz', tone: 'info', text: pickNonRepeating(lines, null, random) }
}

/** Every 20 answers the owl reminds the learner to rest their eyes and drink water. */
export function getBreakReminder(answered: number, random: () => number = Math.random): OwlReaction | null {
  if (answered === 0 || answered % 20 !== 0) return null
  const lines = [
    `Bạn đã trả lời ${answered} câu rồi! Nhớ uống nước và cho mắt nghỉ nhé. 💧`,
    `${answered} câu rồi đó, giỏi quá! Đứng dậy vươn vai một chút nha.`,
  ]
  return { pose: 'laptop', motion: 'calm', effect: 'zzz', tone: 'info', text: pickNonRepeating(lines, null, random) }
}

const STUDY_DONE_RESPONSES = [
  'Chúc mừng bạn đã hoàn thành bài học xuất sắc!',
  'Tuyệt đỉnh! Đã chinh phục toàn bộ thẻ học!',
  'Quá cừ khôi! Bạn đã làm chủ hết bộ thẻ này rồi!',
  'Hoàn thành bài học rồi, bạn thật kiên trì!',
  'Về đích! Giờ thử làm bài Kiểm tra để chắc chắn nhé!',
  'Cả bộ thẻ đã nằm gọn trong đầu bạn rồi! 🎉',
]

export function getStudyCompleteReaction(previousText?: string | null, random: () => number = Math.random): OwlReaction {
  return {
    pose: 'party', motion: 'hop', effect: 'confetti', tone: 'success',
    celebrateKey: `study-done-${Math.floor(random() * 10000)}`,
    text: pickNonRepeating(STUDY_DONE_RESPONSES, previousText, random),
  }
}

export function getTestScoreReaction(score: number, total: number, previousText?: string | null, random: () => number = Math.random): OwlReaction {
  const ratio = total > 0 ? score / total : 0

  if (ratio >= 0.9) {
    const pool = [
      'Xuất sắc! Điểm số gần như tuyệt đối, bạn nhớ siêu thật!',
      'Thành tích đáng nể! Bạn nắm rất chắc bộ từ này rồi.',
      'Đỉnh cao! Bạn đã ghi nhớ xuất sắc bộ thẻ này.',
      'Phong độ hoàn hảo, chúc mừng bạn nhé!',
      'Điểm này mà đi thi IELTS thì quá ổn luôn! 🏆',
    ]
    return { pose: 'party', motion: 'hop', effect: 'confetti', tone: 'success', celebrateKey: `test-high-${Math.floor(random() * 10000)}`, text: pickNonRepeating(pool, previousText, random) }
  }

  if (ratio >= 0.7) {
    const pool = [
      'Làm tốt lắm! Chỉ cần ôn lại vài câu là hoàn hảo rồi.',
      'Kết quả rất khá! Cố gắng ôn thêm các câu sai nhé.',
      'Ấn tượng đấy! Điểm số rất tích cực, phát huy nhé!',
      'Bạn nhớ bài khá chắc chắn rồi, tiếp tục ôn luyện nhé!',
      'Gần chạm mốc xuất sắc rồi, xem lại các câu sai bên dưới nha!',
    ]
    return { pose: 'cheer', motion: 'hop', effect: 'stars', tone: 'success', text: pickNonRepeating(pool, previousText, random) }
  }

  if (ratio >= 0.5) {
    const pool = [
      'Khá ổn rồi! Thử vào chế độ Học ôn lại một lượt nha.',
      'Bạn đã nhớ được hơn một nửa rồi, ôn thêm chút là vững ngay!',
      'Nắm được nhiều từ rồi đấy, luyện thêm một chút nữa nhé!',
      'Khởi đầu tốt! Dành thêm chút thời gian là sẽ tiến bộ ngay.',
    ]
    return { pose: 'idea', motion: 'calm', effect: 'idea', tone: 'warning', text: pickNonRepeating(pool, previousText, random) }
  }

  const pool = [
    'Không sao cả, thử vào chế độ Học để luyện thêm nhé!',
    'Cố lên bạn ơi, ôn lại vài lần là sẽ nhớ ngay thôi!',
    'Đừng nản lòng, chúng mình cùng luyện lại bộ thẻ nhé!',
    'Mỗi lần ôn là một lần nhớ sâu hơn, tiếp tục cố gắng nhé!',
    'Điểm hôm nay chỉ là điểm xuất phát thôi, cú tin bạn! 🦉',
  ]
  return { pose: 'wave', motion: 'calm', effect: 'wave', tone: 'info', text: pickNonRepeating(pool, previousText, random) }
}

export function getSpacedReviewReaction(remembered: boolean, previousText?: string | null, random: () => number = Math.random): OwlReaction {
  if (remembered) {
    const pool = [
      'Thẻ đã được chuyển sang hộp tiếp theo rồi!',
      'Nhớ rất tốt, tiếp tục phát huy nào!',
      'Tuyệt vời, trí nhớ của bạn đang tiến bộ!',
      'Chuẩn xác, giữ vững nhịp ôn tập nhé!',
      'Thẻ này sẽ nghỉ lâu hơn vì bạn nhớ chắc rồi!',
    ]
    return { pose: 'cheer', motion: 'hop', effect: 'stars', tone: 'success', text: pickNonRepeating(pool, previousText, random) }
  }

  const pool = [
    'Không sao, thẻ sẽ quay lại sớm để bạn nhớ chắc hơn.',
    'Ổn thôi, ôn lại lần nữa là sẽ nhớ ngay!',
    'Chưa nhớ cũng tốt, thẻ sẽ được ưu tiên ôn lại!',
    'Đừng lo, lặp lại ngắt quãng sẽ giúp nhớ sâu hơn.',
    'Thành thật với bản thân là cách ôn hiệu quả nhất đó!',
  ]
  return { pose: 'confused', motion: 'calm', effect: 'shake', tone: 'info', text: pickNonRepeating(pool, previousText, random) }
}

export function getBrowserMarkReaction(markedLearned: boolean, previousText?: string | null, random: () => number = Math.random): OwlReaction {
  if (markedLearned) {
    const pool = [
      'Thẻ đã vào nhóm Đã thuộc!',
      'Tuyệt vời, thêm một từ đã thuộc lòng!',
      'Rất tốt, từ này đã được đánh dấu thuộc!',
      'Thêm một ngôi sao vào bộ sưu tập từ vựng! ⭐',
    ]
    return { pose: 'confident', motion: 'hop', effect: 'hearts', tone: 'success', text: pickNonRepeating(pool, previousText, random) }
  }

  const pool = [
    'Ổn thôi, thẻ sẽ đến hạn ôn lại ngay.',
    'Đã đánh dấu cần ôn, lát nữa luyện lại nhé.',
    'Không sao, đánh dấu để không bị quên từ này!',
    'Biết mình quên là bước đầu để nhớ lại đó!',
  ]
  return { pose: 'wave', motion: 'calm', effect: 'wave', tone: 'info', text: pickNonRepeating(pool, previousText, random) }
}
