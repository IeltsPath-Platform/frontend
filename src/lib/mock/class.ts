export type ClassSessionStatus = "done" | "today" | "upcoming" | "waiting"

export type ClassSession = {
  id: string
  sessionNo: number
  courseLabel: string
  weekday: string
  dateLabel: string
  title: string
  timeRange: string
  status: ClassSessionStatus
  progress: number
}

export type MaterialTab = "slides" | "summary" | "documents"

export type HomeworkTab = "grammar" | "vocab" | "quiz" | "skills"

export const CLASS_PROFILE = {
  classCode: "IE3-88",
  teacherName: "Jessi Thuy Anh",
  scheduleDays: "Thứ 3-5-7",
  scheduleTime: "18:30 - 20:30",
  course: {
    name: "IELTS Cất cánh",
    bandRange: "3.0 - IELTS 4.0+",
    startDate: "14/07/2026",
    endDate: "14/09/2026",
    classProgress: 37.5,
    sessionsDone: 12,
    sessionsTotal: 32,
  },
  mentor: {
    name: "Ms. Lan",
    title: "IELTS Instructor",
    initial: "L",
  },
  nextLesson: {
    title: "Bài 13 · Speaking Part 3",
    when: "Thứ Sáu 18:00",
  },
}

export const CLASS_STATS = {
  personalProgress: { value: 68, note: "Bạn đang làm tốt!" },
  homeworkDiligence: { value: 78, note: "Có cố gắng!" },
  attendance: { value: 90, note: "Bạn vắng 1 buổi học có phép" },
  homeworkScore: { value: 90, max: 100, note: "Bạn làm rất tốt!" },
}

export const CLASS_MONTH_LABEL = "Tháng 9/2026"

export const CLASS_SESSIONS: ClassSession[] = [
  { id: "s-01", sessionNo: 1, courseLabel: "IELTS 3.0", weekday: "Thứ 3", dateLabel: "07/09", title: "Bài 1: Nhập môn Anh ngữ", timeRange: "18:30 - 20:30", status: "done", progress: 100 },
  { id: "s-02", sessionNo: 2, courseLabel: "IELTS 3.0", weekday: "Thứ 5", dateLabel: "08/09", title: "Bài 2: Listening — Keyword map", timeRange: "18:30 - 20:30", status: "today", progress: 60 },
  { id: "s-03", sessionNo: 3, courseLabel: "IELTS 3.0", weekday: "Thứ 7", dateLabel: "10/09", title: "Bài 3: Reading — Skimming & scanning", timeRange: "18:30 - 20:30", status: "upcoming", progress: 30 },
  { id: "s-04", sessionNo: 4, courseLabel: "IELTS 3.0", weekday: "Thứ 3", dateLabel: "14/09", title: "Bài 4: Writing Task 1 — Overview", timeRange: "18:30 - 20:30", status: "upcoming", progress: 30 },
  { id: "s-05", sessionNo: 5, courseLabel: "IELTS 3.0", weekday: "Thứ 5", dateLabel: "16/09", title: "Bài 5: Speaking Part 1 — Everyday life", timeRange: "18:30 - 20:30", status: "upcoming", progress: 30 },
  { id: "s-06", sessionNo: 6, courseLabel: "IELTS 3.0", weekday: "Thứ 7", dateLabel: "18/09", title: "Bài 6: Vocabulary — Education theme", timeRange: "18:30 - 20:30", status: "waiting", progress: 0 },
  { id: "s-07", sessionNo: 7, courseLabel: "IELTS 3.0", weekday: "Thứ 3", dateLabel: "21/09", title: "Bài 7: Grammar — Present perfect", timeRange: "18:30 - 20:30", status: "waiting", progress: 0 },
  { id: "s-08", sessionNo: 8, courseLabel: "IELTS 3.0", weekday: "Thứ 5", dateLabel: "23/09", title: "Bài 8: Listening Section 2 — Map", timeRange: "18:30 - 20:30", status: "waiting", progress: 0 },
  { id: "s-09", sessionNo: 9, courseLabel: "IELTS 3.0", weekday: "Thứ 7", dateLabel: "25/09", title: "Bài 9: Reading — Matching headings", timeRange: "18:30 - 20:30", status: "waiting", progress: 0 },
  { id: "s-10", sessionNo: 10, courseLabel: "IELTS 3.0", weekday: "Thứ 3", dateLabel: "28/09", title: "Bài 10: Writing Task 2 — Opinion", timeRange: "18:30 - 20:30", status: "waiting", progress: 0 },
  { id: "s-11", sessionNo: 11, courseLabel: "IELTS 3.0", weekday: "Thứ 5", dateLabel: "30/09", title: "Bài 11: Speaking Part 2 — Cue card", timeRange: "18:30 - 20:30", status: "waiting", progress: 0 },
  { id: "s-12", sessionNo: 12, courseLabel: "IELTS 3.0", weekday: "Thứ 7", dateLabel: "02/10", title: "Bài 12: Quick Test tổng hợp", timeRange: "18:30 - 20:30", status: "waiting", progress: 0 },
]

export const ACTIVE_LESSON = {
  sessionNo: 1,
  coursePill: "Khoá IELTS 3.0",
  lessonPill: "Bài 1: Nature & Environment",
  title: "Bài 1: Nature & Environment",
}

export const SLIDE_PAGES = [
  { id: "sl-1", label: "01 · Warm-up", hint: "What do you already know about nature?" },
  { id: "sl-2", label: "02 · Topic map", hint: "Climate · Wildlife · Conservation" },
  { id: "sl-3", label: "03 · Key vocabulary", hint: "habitat · biodiversity · sustainable" },
  { id: "sl-4", label: "04 · Listening focus", hint: "Keyword prediction before audio" },
  { id: "sl-5", label: "05 · Practice task", hint: "Match headings with paragraphs" },
]

export const LESSON_OUTCOMES = [
  "Nhận diện lexical set chủ đề Nature & Environment",
  "Dự đoán keyword trước khi nghe / đọc",
  "Tóm tắt ý chính của đoạn văn ngắn trong 2 câu",
  "Dùng linking phrases để mô tả nguyên nhân — kết quả",
]

export const COURSE_DOCUMENTS = [
  { id: "doc-1", title: "Tài liệu 1 · Giáo trình buổi 1", meta: "PDF · 12 trang" },
  { id: "doc-2", title: "Tài liệu 2 · Bài tập về nhà", meta: "PDF · 6 trang" },
  { id: "doc-3", title: "Tài liệu 3 · File luyện nghe TIS 2899", meta: "MP3 · 04:20" },
  { id: "doc-4", title: "Tài liệu 4 · Word list Nature", meta: "XLSX · 40 từ" },
]

export const GRAMMAR_OPTIONS = [
  { id: "A", text: "have lived" },
  { id: "B", text: "lived" },
  { id: "C", text: "am living" },
  { id: "D", text: "was lived" },
]

export const VOCAB_ENTRY = {
  headword: "sustainable",
  phonetics: { uk: "/səˈsteɪnəbl/", us: "/səˈsteɪnəbl/" },
  type: "Adjective",
  cefr: "B2",
  meaning: "Có thể duy trì lâu dài mà không gây hại cho môi trường",
  topic: "Nature & Environment",
}

export const QUIZ_QUESTION = {
  meta: "Question 1 — Single Choice",
  stem: "Which option best completes: “Many species ___ extinct if we do not protect their habitats.”?",
  options: [
    { id: "A", text: "will become" },
    { id: "B", text: "become" },
    { id: "C", text: "becomes" },
    { id: "D", text: "became" },
  ],
}

export const SKILLS_PASSAGE = {
  title: "Reading Passage 1",
  instruction: "You should spend about 20 minutes on Questions 1–13.",
  body: `Urban wetlands are often overlooked, yet they filter pollutants, store floodwater, and host migrating birds. Cities that restore these spaces report cooler microclimates and higher resident wellbeing. Conservation groups argue that small green corridors between wetlands matter as much as the wetlands themselves.`,
}

export const OVERVIEW_SIDEBAR = [
  { id: "overview", label: "Overview", to: "/overview" },
  { id: "detail", label: "Dữ liệu chi tiết", to: "/dashboard" },
  { id: "fav", label: "Danh sách yêu thích", to: "/practice" },
  { id: "history", label: "Lịch sử ôn luyện", to: "/practice" },
  { id: "orders", label: "Lịch sử đơn hàng", to: "/blog" },
  { id: "support", label: "Hỗ trợ", to: "/community" },
  { id: "profile", label: "Hồ sơ", to: "/dashboard" },
  { id: "rank", label: "Xếp hạng", to: "/community" },
]

export const OVERVIEW_STATS = [
  { id: "time", tone: "purple", label: "Tổng thời gian học", value: "47h 20m", note: "+2h tuần này" },
  { id: "days", tone: "orange", label: "Số ngày học", value: "38 ngày", note: "Chuỗi 5 ngày liên tiếp" },
  { id: "tests", tone: "green", label: "Số đề đã luyện", value: "124 đề", note: "18 đề tháng này" },
]

export const PRACTICE_CARDS = [
  {
    id: "p1",
    tag: "Passage 1",
    title: "Vitamins — To supplement or not?",
    types: ["Gap Filling", "Match Information", "Yes/No/Not Given"],
    free: true,
    done: false,
    image:
      "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p2",
    tag: "Passage 2",
    title: "Crocodiles and urban rivers",
    types: ["Matching Headings", "Summary Completion"],
    free: true,
    done: false,
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p3",
    tag: "Passage 3",
    title: "The future of remote work",
    types: ["Multiple Choice", "True/False/NG"],
    free: false,
    done: true,
    image:
      "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: "p4",
    tag: "Passage 1",
    title: "Coral reefs under pressure",
    types: ["Diagram Label", "Short Answer"],
    free: true,
    done: false,
    image:
      "https://images.unsplash.com/photo-1546026423-cc14cd77f0bd?auto=format&fit=crop&w=800&q=80",
  },
]
