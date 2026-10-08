import type { LearningGoal } from '~types/learningPath'

/** The band columns of the feasibility chart; the ends stand for "or below" and "or above". */
export const BAND_STEPS = [5.5, 6, 6.5, 7, 7.5, 8] as const

/** The chart column a band falls in. */
export function bandStep(band: number): number {
  const rounded = Math.round(band * 2) / 2
  return Math.min(BAND_STEPS[BAND_STEPS.length - 1], Math.max(BAND_STEPS[0], rounded))
}

export const stepLabel = (step: number) =>
  step === BAND_STEPS[0] ? `≤${step.toFixed(1)}` : step === BAND_STEPS[BAND_STEPS.length - 1] ? `≥${step.toFixed(1)}` : step.toFixed(1)

export const CRITERION_NAMES: Record<string, string> = {
  TA: 'Task Achievement',
  TR: 'Task Response',
  CC: 'Coherence & Cohesion',
  LR: 'Lexical Resource',
  GRA: 'Grammatical Range & Accuracy',
}

/** Whole days from today to the exam date, or null when none was picked or it has passed. */
export function daysUntil(examDate: string | null, now = new Date()): number | null {
  if (!examDate) return null
  const exam = new Date(`${examDate}T00:00:00`)
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const days = Math.round((exam.getTime() - today.getTime()) / 86_400_000)
  return Number.isFinite(days) && days >= 0 ? days : null
}

export const hoursPerWeek = (minutesPerDay: number) => Math.round((minutesPerDay * 7) / 60 * 2) / 2

/**
 * A rough reading of how reachable the target is: about 2.5 months of study per half band at 7 hours a week, scaled
 * by the hours the learner set aside. It is a rule of thumb to frame the advice, not a prediction.
 */
export function feasibility(overall: number, goal: LearningGoal | null): { tone: 'none' | 'done' | 'ok' | 'tight'; text: string; tip: string } {
  if (!goal) {
    return {
      tone: 'none',
      text: 'Bạn chưa đặt band mục tiêu nên hệ thống chưa đánh giá được khả năng đạt mục tiêu.',
      tip: 'Làm lại khảo sát để đặt band mục tiêu và thời gian học, báo cáo sẽ có lộ trình phù hợp hơn.',
    }
  }
  const gap = goal.targetBand - overall
  if (gap <= 0) {
    return {
      tone: 'done',
      text: `Band hiện tại đã đạt mục tiêu ${goal.targetBand.toFixed(1)}. Bạn có thể đặt mục tiêu cao hơn hoặc luyện đề để giữ phong độ.`,
      tip: 'Luyện đề full test theo thời gian thật để quen áp lực phòng thi.',
    }
  }
  const hours = Math.max(1, hoursPerWeek(goal.availableMinutesPerDay))
  const monthsNeeded = (gap / 0.5) * 2.5 * Math.min(2, Math.max(0.5, 7 / hours))
  const days = daysUntil(goal.examDate)
  const monthsLeft = days === null ? null : days / 30
  const base = overall < 5.5
    ? 'Band hiện tại của bạn đang ở mức nền tảng. Ở giai đoạn này, hãy tập trung chắc ngữ pháp, từ vựng và phát âm cơ bản trước; khi nền tảng vững, việc luyện IELTS sẽ nhanh hơn nhiều.'
    : `Bạn cần tăng thêm khoảng ${gap.toFixed(1)} band để đạt mục tiêu ${goal.targetBand.toFixed(1)}.`
  if (monthsLeft === null) {
    return {
      tone: 'ok',
      text: `${base} Với ${hours} giờ/tuần, bạn cần khoảng ${Math.ceil(monthsNeeded)} tháng học đều đặn.`,
      tip: 'Chọn ngày thi dự kiến để hệ thống đánh giá mục tiêu sát hơn.',
    }
  }
  const tight = monthsNeeded > monthsLeft
  return {
    tone: tight ? 'tight' : 'ok',
    text: tight
      ? `${base} Với ${hours} giờ/tuần, bạn cần khoảng ${Math.ceil(monthsNeeded)} tháng trong khi chỉ còn khoảng ${Math.max(1, Math.round(monthsLeft))} tháng, nên mục tiêu khá gấp.`
      : `${base} Với ${hours} giờ/tuần, khoảng ${Math.ceil(monthsNeeded)} tháng là đủ, nằm trong thời gian bạn còn lại.`,
    tip: tight
      ? 'Tăng thời gian học mỗi ngày hoặc lùi ngày thi, và ưu tiên kỹ năng có band thấp nhất trước.'
      : 'Giữ lịch học đều mỗi ngày và làm lại bài test sau mỗi chặng để đo tiến bộ.',
  }
}

/** Speaking is not graded from recordings yet; the report shows this general guidance in its place. */
export const SPEAKING_REVIEW: Array<{ criterion: string; comment: string; study: string }> = [
  {
    criterion: 'Fluency & Coherence',
    comment: 'Trả lời đủ ý thay vì một câu ngắn rồi dừng. Phát triển câu trả lời theo công thức Nêu ý → Giải thích → Ví dụ, dùng từ nối để dẫn dắt mạch lạc.',
    study: 'Mở rộng câu trả lời Part 1 thành 2–3 câu; luyện nói liền 1–2 phút cho Part 2.',
  },
  {
    criterion: 'Lexical Resource',
    comment: 'Tránh lặp các từ quá cơ bản như "good", "interesting", "like". Dùng từ đồng nghĩa và cụm từ tự nhiên theo chủ đề.',
    study: 'Học từ vựng theo chủ đề quen thuộc (quê hương, công việc, sở thích) kèm collocation.',
  },
  {
    criterion: 'Grammatical Range & Accuracy',
    comment: 'Kết hợp câu đơn với câu phức (mệnh đề quan hệ, mệnh đề trạng ngữ). Chú ý thì của động từ và dạng từ sau động từ nối (feel, look, seem + tính từ).',
    study: 'Luyện câu phức và các lỗi hay gặp: thì, mạo từ, dạng từ.',
  },
  {
    criterion: 'Pronunciation',
    comment: 'Bật rõ âm cuối (/s/, /z/, /t/, /d/) và nhấn vào từ mang nội dung chính để giọng nói có ngữ điệu, không đều đều như đọc thuộc lòng.',
    study: 'Luyện âm cuối và trọng âm từ; nghe và nhại lại (shadowing) đoạn hội thoại ngắn mỗi ngày.',
  },
]
