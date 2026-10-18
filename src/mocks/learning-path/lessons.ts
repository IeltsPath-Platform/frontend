import type { MockLesson } from './contentTypes'

/** The public demo deck; every mock lesson shows it. */
const DEMO_DECK = 'https://docs.google.com/presentation/d/1rky9iPmndXAGDhwcMSI8QM2jN1QaVyelycgAsloB7kM/edit'

function lesson(base: Omit<MockLesson, 'slides' | 'documents'>): MockLesson {
  return {
    ...base,
    slides: [{ id: `${base.id}-slide`, title: `Slide bài giảng: ${base.title}`, url: DEMO_DECK }],
    documents: [
      { id: `${base.id}-doc-1`, title: 'Tài liệu 1: Giáo trình', url: 'https://example.com/ieltspath/giao-trinh.pdf' },
      { id: `${base.id}-doc-2`, title: 'Tài liệu 2: Bài tập', url: 'https://example.com/ieltspath/bai-tap.pdf' },
    ],
  }
}

const L1 = lesson({
  id: 'lesson-l1',
  topicId: 'topic-demo-reading',
  title: 'Nhận diện paraphrase',
  sortOrder: 1,
  estimatedMinutes: 12,
  summaryMarkdown: 'Đề IELTS hiếm khi lặp lại nguyên văn câu trong bài đọc. Thay vào đó, đề dùng paraphrase: cùng ý nhưng đổi từ hoặc đổi cấu trúc.\n\nCách làm:\n1. Gạch từ khóa trong câu hỏi.\n2. Nghĩ trước vài cách nói khác của từ khóa đó (quicker → faster, sense → feeling).\n3. Tìm đoạn chứa ý tương đương, không phải từ giống hệt.',
})

const L2 = lesson({
  id: 'lesson-l2',
  topicId: 'topic-demo-reading',
  title: 'Scanning: tìm thông tin cụ thể',
  sortOrder: 2,
  estimatedMinutes: 15,
  summaryMarkdown: 'Scanning là lướt mắt tìm một "điểm neo" dễ thấy: con số, năm, tên riêng, chữ in hoa.\n\nCách làm:\n1. Xác định loại thông tin cần tìm (số lượng, năm, tên tàu…).\n2. Lướt nhanh chỉ để bắt điểm neo, chưa đọc kỹ.\n3. Khi thấy điểm neo, đọc kỹ cả câu chứa nó và câu kế tiếp.\n\nBẫy thường gặp: hai thông tin gần giống nhau đứng sát nhau. "First to be sighted" (được nhìn thấy đầu tiên) không đồng nghĩa với "docked first" (cập cảng đầu tiên).',
})

const L3 = lesson({
  id: 'lesson-l3',
  topicId: 'topic-demo-reading',
  title: 'Ý chính đoạn và điền từ',
  sortOrder: 3,
  estimatedMinutes: 15,
  summaryMarkdown: 'Ý chính của đoạn thường nằm ở câu đầu, hoặc sau từ chuyển ý như However, Yet, In contrast.\n\nVới dạng điền từ:\n1. Đoán loại từ cần điền (danh từ, tính từ…).\n2. Tìm câu paraphrase trong bài.\n3. Chép đúng chính tả và không vượt giới hạn số từ.',
})

const L4 = lesson({
  id: 'lesson-l4',
  topicId: 'topic-demo-reading',
  title: 'Làm quen True / False / Not Given',
  sortOrder: 4,
  estimatedMinutes: 12,
  summaryMarkdown: 'TRUE: bài đọc khẳng định đúng ý của câu.\nFALSE: bài đọc nói điều ngược lại.\nNOT GIVEN: bài đọc không đủ thông tin để kết luận.\n\nMẹo: nếu bạn phải tự suy luận thêm điều bài không nói, đáp án thường là NOT GIVEN.',
})

const TFNG_1 = lesson({
  id: 'lesson-tfng-1',
  topicId: 'topic-tfng-skills',
  title: 'FALSE khác NOT GIVEN thế nào',
  sortOrder: 1,
  estimatedMinutes: 8,
  summaryMarkdown: ['FALSE nghĩa là bài đọc có thông tin MÂU THUẪN với câu hỏi.\nNOT GIVEN nghĩa là bài đọc KHÔNG NÓI tới điều đó, dù có thể nhắc tới chủ đề liên quan.', 'Ví dụ: bài viết "Cửa hàng mở cửa từ năm 1990."\n• "Cửa hàng mở năm 1985." → FALSE (mâu thuẫn).\n• "Cửa hàng đông khách nhất thành phố." → NOT GIVEN (bài không nói).'].join('\n\n'),
})

const TFNG_2 = lesson({
  id: 'lesson-tfng-2',
  topicId: 'topic-tfng-skills',
  title: 'Từ hạn định: most, all, only',
  sortOrder: 2,
  estimatedMinutes: 12,
  summaryMarkdown: 'Các từ như most, all, only, never làm câu hỏi "chặt" hơn bài đọc. Hãy so sánh mức độ, đừng chỉ so từ khóa.',
})

const MH_1 = lesson({
  id: 'lesson-mh-1',
  topicId: 'topic-matching-headings',
  title: 'Đọc câu chủ đề',
  sortOrder: 1,
  estimatedMinutes: 10,
  summaryMarkdown: 'Tiêu đề phù hợp phản ánh ý của cả đoạn, không chỉ một chi tiết.',
})

const MH_2 = lesson({
  id: 'lesson-mh-2',
  topicId: 'topic-matching-headings',
  title: 'Bẫy từ khóa trùng',
  sortOrder: 2,
  estimatedMinutes: 10,
  summaryMarkdown: 'Tiêu đề có từ trùng với đoạn văn chưa chắc là đáp án đúng.',
})

export const MOCK_LESSONS: MockLesson[] = [L1, L2, L3, L4, TFNG_1, TFNG_2, MH_1, MH_2]
