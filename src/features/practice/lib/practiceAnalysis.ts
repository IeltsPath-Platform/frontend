/** Rules that turn the numbers of a finished practice test into ratings, priorities and advice. */

export type AccuracyRating = 'excellent' | 'good' | 'average' | 'weak' | 'veryWeak'

export const RATING_LABELS: Record<AccuracyRating, string> = {
  excellent: 'Xuất sắc',
  good: 'Tốt',
  average: 'Trung bình',
  weak: 'Yếu',
  veryWeak: 'Rất yếu',
}

/** Below this share of correct answers a question format counts as a reason for losing points. */
export const WEAK_BELOW_PERCENT = 50

/** The share of correct answers decides the rating: 90+ excellent, 75+ good, 50+ average, 25+ weak, else very weak. */
export function rateAccuracy(percent: number): AccuracyRating {
  if (percent >= 90) return 'excellent'
  if (percent >= 75) return 'good'
  if (percent >= 50) return 'average'
  if (percent >= 25) return 'weak'
  return 'veryWeak'
}

export interface FormatStat {
  formatCode: string
  total: number
  correct: number
  incorrect: number
  blank: number
}

export interface RatedFormat extends FormatStat {
  percent: number
  rating: AccuracyRating
  /** 1 or 2 for the formats that cost the most points, otherwise null. */
  priority: 1 | 2 | null
}

/**
 * Rates every format, weakest first. Only formats under the weak line can be a priority, ranked by the number of
 * questions they lost (a long format at 40% hurts more than a short one at 0%).
 */
export function rateFormats(stats: readonly FormatStat[]): RatedFormat[] {
  const rated = stats.map((stat) => {
    const percent = stat.total ? Math.round(stat.correct / stat.total * 100) : 0
    return { ...stat, percent, rating: rateAccuracy(percent), priority: null as 1 | 2 | null }
  })
  const lost = (format: RatedFormat) => format.total - format.correct
  rated
    .filter((format) => format.percent < WEAK_BELOW_PERCENT)
    .sort((a, b) => lost(b) - lost(a) || a.percent - b.percent)
    .slice(0, 2)
    .forEach((format, index) => { format.priority = index === 0 ? 1 : 2 })
  return rated.sort((a, b) => a.percent - b.percent || b.total - a.total)
}

/** The formats that explain the lost points: the ones under the weak line, worst first. */
export function weakFormats(rated: readonly RatedFormat[]): RatedFormat[] {
  return rated.filter((format) => format.percent < WEAK_BELOW_PERCENT).sort((a, b) => a.percent - b.percent || b.total - a.total)
}

/** One line of method for each question format; unknown formats get a general tip. */
const FORMAT_TIPS: Record<string, string> = {
  TRUE_FALSE_NOT_GIVEN: 'Phân biệt FALSE (trái ngược với bài) và NOT GIVEN (bài không nhắc tới); đừng dùng kiến thức bên ngoài.',
  YES_NO_NOT_GIVEN: 'Tìm ý kiến của tác giả chứ không phải sự kiện; chú ý các từ chỉ mức độ như may, usually, all.',
  GAP_FILLING: 'Đoán loại từ cần điền trước; chép đúng từ trong bài và tuân thủ giới hạn số từ.',
  SENTENCE_COMPLETION: 'Tìm câu gốc trong bài bằng từ khóa, rồi điền đúng dạng từ và giới hạn số từ.',
  SUMMARY_COMPLETION: 'Đọc cả đoạn tóm tắt để hiểu ý, đoán loại từ cần điền rồi tìm trong đoạn tương ứng của bài.',
  FORM_COMPLETION: 'Đoán loại thông tin cần điền (số, tên, ngày); nghe kỹ chính tả và các con số.',
  NOTE_COMPLETION: 'Gạch từ khóa của từng ô trước khi nghe; ghi đúng chính tả và giới hạn số từ.',
  MULTIPLE_CHOICE_ONE: 'Gạch từ khóa của cả ba đáp án; loại đáp án sai trước và cẩn thận với các từ gây nhiễu.',
  MULTIPLE_CHOICE_MANY: 'Xác định đủ số đáp án cần chọn; xét từng phương án với đoạn văn tương ứng.',
  MATCHING_INFORMATION: 'Lấy từ khóa của thông tin cần tìm rồi lướt qua từng đoạn; một đoạn có thể được dùng nhiều lần.',
  MATCHING_HEADINGS: 'Đọc câu đầu và câu cuối mỗi đoạn để nắm ý chính; loại các tiêu đề chỉ trùng từ khóa.',
  MATCHING: 'Đọc trước danh sách lựa chọn; chúng thường xuất hiện theo thứ tự nên đừng kẹt ở câu đã lỡ.',
  MAP_DIAGRAM_LABEL: 'Xác định các mốc trên bản đồ hoặc sơ đồ trước khi nghe, rồi theo dõi từ chỉ hướng và vị trí.',
  MATCHING_FEATURES:'Đọc trước danh sách lựa chọn; chúng thường xuất hiện theo thứ tự nên đừng kẹt ở câu đã lỡ.',
}
const GENERAL_TIP = 'Luyện riêng dạng này để quen cách hỏi và rút kinh nghiệm từ phần giải thích.'

export function formatTip(formatCode: string): string {
  return FORMAT_TIPS[formatCode] ?? GENERAL_TIP
}

/** The mascot's sentence, chosen by the overall share of correct answers. */
export function mascotMessage(percent: number): string {
  if (percent >= 90) return 'Xuất sắc! Gần như tuyệt đối, bạn đã sẵn sàng cho thử thách cao hơn!'
  if (percent >= 75) return 'Rất tốt! Bạn nắm khá chắc, chỉ cần soát lại vài dạng nhỏ nữa thôi.'
  if (percent >= 50) return 'Khá ổn! Củng cố thêm các dạng còn yếu để lên band nhanh hơn nhé.'
  if (percent >= 25) return 'Đề IELTS hơi khó bạn nhỉ, mình cố tiếp cùng nhau nha, từ từ sẽ giỏi thôi!'
  return 'Đừng nản nhé! Hãy xem phần giải thích và luyện từng dạng một, bạn sẽ tiến bộ.'
}

export interface TimeAdvice {
  /** spent / limit, or null when there is no limit to compare with. */
  usedShare: number | null
  secondsPerQuestion: number | null
  message: string
}

/**
 * Compares the time the learner took with the time the test gives. A very short attempt on a long test usually means
 * guessing, a very long one means the pace is too slow for the real exam.
 */
export function adviseTime(spentSeconds: number | null, limitSeconds: number | null, questionCount: number): TimeAdvice {
  if (spentSeconds === null) return { usedShare: null, secondsPerQuestion: null, message: 'Chưa ghi nhận được thời gian làm bài.' }
  const perQuestion = questionCount > 0 ? Math.round(spentSeconds / questionCount) : null
  if (!limitSeconds) return { usedShare: null, secondsPerQuestion: perQuestion, message: perQuestion === null ? '' : `Bạn dùng khoảng ${perQuestion} giây cho mỗi câu.` }
  const share = spentSeconds / limitSeconds
  const pace = perQuestion === null ? '' : ` (khoảng ${perQuestion} giây/câu)`
  let message: string
  if (share < 0.3) message = `Bạn nộp bài sau chỉ ${Math.round(share * 100)}% thời gian cho phép${pace}, nhiều khả năng đã đoán đáp án. Hãy đọc kỹ hơn và dành thời gian soát lại.`
  else if (share <= 0.85) message = `Bạn dùng ${Math.round(share * 100)}% thời gian cho phép${pace}, còn dư thời gian để soát lại đáp án.`
  else if (share <= 1) message = `Bạn dùng gần hết thời gian${pace}. Hãy luyện tăng tốc để còn thời gian soát bài.`
  else message = `Bạn làm quá thời gian quy định${pace}. Hãy giới hạn thời gian cho từng phần khi luyện.`
  return { usedShare: share, secondsPerQuestion: perQuestion, message }
}

/** mm:ss, or h:mm:ss from an hour on; a dash when the value is unknown. */
export function formatMinutes(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const safe = Math.max(0, Math.round(seconds))
  const hours = Math.floor(safe / 3600)
  const minutes = Math.floor((safe % 3600) / 60)
  const rest = String(safe % 60).padStart(2, '0')
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${rest}` : `${String(minutes).padStart(2, '0')}:${rest}`
}

/** hh:mm:ss, the way the exam clock shows it. */
export function formatClockTime(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds)) return '—'
  const safe = Math.max(0, Math.round(seconds))
  return [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60].map((value) => String(value).padStart(2, '0')).join(':')
}
