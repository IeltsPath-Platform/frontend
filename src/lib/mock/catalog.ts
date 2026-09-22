import type { ExamSkill } from "@/types/exam"

export type CatalogSkill = ExamSkill | "FULL_TEST"

export interface CatalogTest {
  id: string
  title: string
  source: string
  skill: CatalogSkill
  questionType: string
  durationMinutes: number
  questionCount: number
  attempts: number
  averageBand: number
}

export const SKILL_ENTRIES: { skill: CatalogSkill; label: string; detail: string; count: string }[] = [
  { skill: "LISTENING", label: "Listening", detail: "Hội thoại, độc thoại, bản đồ và ghi chú", count: "48 đề" },
  { skill: "READING", label: "Reading", detail: "3 bài đọc học thuật, đủ dạng câu hỏi", count: "52 đề" },
  { skill: "WRITING", label: "Writing", detail: "Task 1 và Task 2, chấm theo 4 tiêu chí", count: "36 đề" },
  { skill: "SPEAKING", label: "Speaking", detail: "Part 1, cue card và thảo luận Part 3", count: "24 đề" },
]

export const QUESTION_TYPES = [
  { id: "form", skill: "LISTENING" as const, label: "Form / Note completion" },
  { id: "map", skill: "LISTENING" as const, label: "Map labeling" },
  { id: "mcq", skill: "LISTENING" as const, label: "Multiple choice" },
  { id: "tfng", skill: "READING" as const, label: "True / False / Not Given" },
  { id: "headings", skill: "READING" as const, label: "Matching headings" },
  { id: "summary", skill: "READING" as const, label: "Summary completion" },
  { id: "task1", skill: "WRITING" as const, label: "Writing Task 1" },
  { id: "task2", skill: "WRITING" as const, label: "Writing Task 2" },
  { id: "part2", skill: "SPEAKING" as const, label: "Speaking Part 2" },
]

export const CATALOG: CatalogTest[] = [
  { id: "cambridge-19-test-1", title: "Cambridge 19 — Test 1", source: "Cambridge 19", skill: "FULL_TEST", questionType: "Full test", durationMinutes: 165, questionCount: 40, attempts: 1842, averageBand: 6.5 },
  { id: "cambridge-18-reading-2", title: "Cambridge 18 — Reading Test 2", source: "Cambridge 18", skill: "READING", questionType: "True / False / Not Given", durationMinutes: 60, questionCount: 40, attempts: 1264, averageBand: 6.5 },
  { id: "cambridge-20-reading-1", title: "Cambridge 20 — Reading Test 1", source: "Cambridge 20", skill: "READING", questionType: "Matching headings", durationMinutes: 60, questionCount: 40, attempts: 908, averageBand: 7 },
  { id: "actual-listening-september", title: "Đề thi thật — Listening tháng 9", source: "Đề thi thật", skill: "LISTENING", questionType: "Form / Note completion", durationMinutes: 40, questionCount: 40, attempts: 1577, averageBand: 6 },
  { id: "cambridge-19-listening-3", title: "Cambridge 19 — Listening Test 3", source: "Cambridge 19", skill: "LISTENING", questionType: "Map labeling", durationMinutes: 40, questionCount: 40, attempts: 733, averageBand: 6.5 },
  { id: "predict-listening-map", title: "Dự đoán — Map & plan", source: "Dự đoán", skill: "LISTENING", questionType: "Map labeling", durationMinutes: 20, questionCount: 10, attempts: 412, averageBand: 6 },
  { id: "writing-graphs-opinion", title: "Biểu đồ giao thông và bài nghị luận", source: "Luyện kỹ năng", skill: "WRITING", questionType: "Writing Task 2", durationMinutes: 60, questionCount: 2, attempts: 689, averageBand: 6 },
  { id: "writing-process-task1", title: "Task 1 — Quy trình xử lý nước", source: "Luyện kỹ năng", skill: "WRITING", questionType: "Writing Task 1", durationMinutes: 20, questionCount: 1, attempts: 540, averageBand: 6.5 },
  { id: "speaking-everyday-life", title: "Speaking — Thói quen hằng ngày", source: "Luyện kỹ năng", skill: "SPEAKING", questionType: "Speaking Part 2", durationMinutes: 14, questionCount: 8, attempts: 476, averageBand: 6.5 },
  { id: "speaking-cities", title: "Speaking — Thành phố đang thay đổi", source: "Dự đoán", skill: "SPEAKING", questionType: "Speaking Part 2", durationMinutes: 14, questionCount: 7, attempts: 301, averageBand: 6 },
  { id: "reading-headings-drill", title: "Drill — Matching headings", source: "Cambridge 18", skill: "READING", questionType: "Matching headings", durationMinutes: 20, questionCount: 7, attempts: 990, averageBand: 6.5 },
  { id: "reading-summary-drill", title: "Drill — Summary completion", source: "Cambridge 20", skill: "READING", questionType: "Summary completion", durationMinutes: 15, questionCount: 6, attempts: 644, averageBand: 7 },
]

export const ROADMAP = [
  { week: "Tuần 1–2", title: "Đo trình độ", tasks: ["Làm 1 bài Reading 60 phút", "Làm Listening Part 1 và 2", "Viết Task 2, không tra từ"] },
  { week: "Tuần 3–5", title: "Sửa dạng hay sai", tasks: ["TFNG và Matching headings", "Map labeling", "Task 1: overview trước số liệu"] },
  { week: "Tuần 6–8", title: "Viết và nói có cấu trúc", tasks: ["2 bài Task 2 mỗi tuần", "Cue card 2 phút, không đọc giấy", "Ôn collocation vừa lưu"] },
  { week: "Tuần 9–12", title: "Thi thử đúng giờ", tasks: ["1 full test mỗi tuần", "Xem lại câu sai trong 24 giờ", "Giữ band mục tiêu ổn định"] },
]

export const VOCAB_TOPICS = [
  {
    id: "environment",
    title: "Môi trường",
    words: [
      { word: "runoff", meaning: "nước chảy tràn trên bề mặt", example: "Urban runoff carries oil into the river." },
      { word: "deplete", meaning: "làm cạn kiệt", example: "Overfishing can deplete coastal stocks." },
      { word: "mitigate", meaning: "làm giảm mức độ", example: "Wetlands mitigate flood damage." },
    ],
  },
  {
    id: "education",
    title: "Giáo dục",
    words: [
      { word: "retention", meaning: "khả năng nhớ lại", example: "Short reviews improve retention." },
      { word: "curriculum", meaning: "chương trình học", example: "The curriculum now includes data skills." },
      { word: "peer review", meaning: "bạn cùng lớp nhận xét bài", example: "Peer review exposed a weak example." },
    ],
  },
  {
    id: "cities",
    title: "Đô thị",
    words: [
      { word: "commute", meaning: "đi lại giữa nhà và nơi làm", example: "The average commute is 42 minutes." },
      { word: "density", meaning: "mật độ", example: "Housing density rose near the station." },
      { word: "infrastructure", meaning: "hạ tầng", example: "The port needs new infrastructure." },
    ],
  },
]

export const DICTATION_LINES = [
  { id: "d1", part: "Listening Part 1", text: "The library closes at half past nine on weekdays." },
  { id: "d2", part: "Listening Part 1", text: "Please bring a passport photo and the booking reference." },
  { id: "d3", part: "Listening Part 4", text: "Coral reefs recover more slowly after repeated heat stress." },
  { id: "d4", part: "Listening Part 2", text: "The exhibition entrance is opposite the main staircase." },
]

export const POSTS = [
  { id: "p1", author: "Hà My", band: "6.5", title: "Mình hay chọn Not Given khi bài không nhắc số liệu", body: "Sau khi xem giải thích, mình mới thấy Not Given chỉ dùng khi bài không có thông tin để kết luận, không phải khi mình không tìm thấy câu giống hệt đề.", replies: 12, time: "2 giờ trước" },
  { id: "p2", author: "Tuấn Kiệt", band: "6.0", title: "Task 1: viết overview trước hay mô tả từng cột trước?", body: "Mình đang bị giám khảo giả lập trừ điểm vì overview chỉ nhắc một xu hướng. Các bạn viết overview gồm mấy ý?", replies: 8, time: "5 giờ trước" },
  { id: "p3", author: "Ngọc Anh", band: "7.0", title: "Cue card về thành phố: hết ý ở giây 70", body: "Mình thêm một ví dụ cá nhân và một so sánh với quê thì đủ 2 phút. Ai có bộ câu hỏi Part 3 đi kèm không?", replies: 15, time: "hôm qua" },
]

export const ARTICLES = [
  {
    slug: "tfng-khong-phai-doan",
    title: "True / False / Not Given không phải bài đoán",
    kicker: "Reading",
    minutes: 6,
    lead: "Ba đáp án này phân biệt bằng chứng trong bài, không phải mức độ bạn thấy câu nghe hợp lý.",
    body: [
      "TRUE khi bài nói cùng ý với câu hỏi, dù dùng từ khác. FALSE khi bài nói ngược lại. NOT GIVEN khi bài không đủ thông tin để kết luận đúng hay sai.",
      "Lỗi hay gặp là chọn NOT GIVEN chỉ vì không thấy cụm từ giống đề. Hãy tìm ý, rồi quyết định bài có đứng về phía câu hỏi, chống lại câu hỏi, hay im lặng.",
      "Khi luyện trên IELTSPath, bấm vào câu sai để xem đoạn chứa manh mối. Nếu không có đoạn nào được đánh dấu, đó là dấu hiệu của NOT GIVEN.",
    ],
  },
  {
    slug: "listening-map",
    title: "Làm bài map labeling khi người nói đi nhanh",
    kicker: "Listening",
    minutes: 5,
    lead: "Trước khi băng chạy, hãy gọi tên các hướng và các địa điểm đã in sẵn trên hình.",
    body: [
      "Dành 20 giây đọc nhãn có sẵn: entrance, bridge, car park. Khi nghe, theo hướng di chuyển thay vì chờ một từ đúng duy nhất.",
      "Các bẫy thường là địa điểm được nhắc rồi bị loại: “not the one next to the café, the building behind it”.",
      "Nếu lỡ một câu, nhảy tới số tiếp theo. Quay lại giữa chừng dễ mất cả phần còn lại.",
    ],
  },
  {
    slug: "task2-overview",
    title: "Task 2: một đoạn thân bài chỉ cần một ý",
    kicker: "Writing",
    minutes: 7,
    lead: "Band 6.5 thường gãy vì nhồi hai ý vào một đoạn rồi không kịp ví dụ.",
    body: [
      "Câu chủ đề nói ý. Câu tiếp theo giải thích vì sao. Câu ví dụ phải cụ thể: một thành phố, một nhóm người, một hệ quả nhìn thấy được.",
      "Tránh mở bài bằng câu hỏi tu từ và kết bài bằng câu hoàn toàn mới. Kết bài chỉ nhắc lại vị trí của bạn bằng từ khác.",
      "Sau khi viết, đếm từ và đọc lại các câu có “which”. Nếu mệnh đề quan hệ không thêm thông tin, hãy tách câu.",
    ],
  },
  {
    slug: "speaking-part2",
    title: "Part 2: dùng 1 phút giấy nháp cho 4 ý",
    kicker: "Speaking",
    minutes: 4,
    lead: "Giấy nháp không phải bài viết. Nó chỉ giữ thứ tự: nơi chốn, việc đã làm, người liên quan, lý do nhớ.",
    body: [
      "Viết từ khóa, không viết câu. Khi nói, nhìn giám khảo và kể theo thứ tự đã ghi.",
      "Nếu hết ý sớm, thêm một chi tiết cảm giác hoặc một thay đổi sau sự việc. Đừng im lặng để nghĩ câu hoàn hảo.",
      "Part 3 sẽ hỏi rộng hơn cùng chủ đề. Hãy chuẩn bị một ý về xã hội, không chỉ về bản thân.",
    ],
  },
]

export const REVIEW_KEYS = [
  { number: 1, prompt: "Urban gardens give neighbours a reason to meet.", answer: "TRUE", locate: "Passage 1, câu thứ hai", why: "Bài nói các khu vườn tạo lý do để hàng xóm gặp nhau. Cùng ý với câu hỏi." },
  { number: 2, prompt: "A garden can solve every environmental problem in a city.", answer: "FALSE", locate: "Passage 1, câu về researchers", why: "Bài viết nhà nghiên cứu cảnh báo một khu vườn không giải quyết được mọi vấn đề môi trường." },
  { number: 3, prompt: "Longer sleep always improves memory.", answer: "FALSE", locate: "Passage 2", why: "Bài nói ngủ lâu hơn không tự động giúp nhớ tốt hơn." },
  { number: 4, prompt: "The best hour to review vocabulary is 10 p.m.", answer: "NOT GIVEN", locate: "Không có trong bài", why: "Bài chỉ nói ôn ngắn trước một đêm ngủ bình thường, không nêu giờ cụ thể." },
  { number: 5, prompt: "Fixed barriers are no longer used on coasts.", answer: "FALSE", locate: "Passage 3, câu mở", why: "Người lập kế hoạch kết hợp barrier với cồn cát, không phải bỏ barrier." },
  { number: 6, prompt: "A structure can shift pressure to another shoreline.", answer: "TRUE", locate: "Passage 3, câu cuối", why: "Bài nói một giải pháp có thể đẩy áp lực sang đoạn bờ khác." },
]
