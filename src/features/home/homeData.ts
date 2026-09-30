// Demonstration content approved for UI preview, not published course offers.
export const HOME_MENTORS = [
  { id: 'lan', name: 'Ms. Lan', initials: 'L', degree: 'Thạc sĩ Giảng dạy tiếng Anh', skill: 'Speaking & Pronunciation', description: 'Phản hồi theo từng tiêu chí Speaking, giúp bạn nhận ra lỗi phát âm và xây dựng câu trả lời tự nhiên.' },
  { id: 'jessi', name: 'Jessi Thuy Anh', initials: 'JA', degree: 'Cử nhân Ngôn ngữ Anh', skill: 'Writing & Grammar', description: 'Chấm bài viết, phân tích cách phát triển ý và hướng dẫn chỉnh sửa để bạn hiểu vì sao cần thay đổi.' },
  { id: 'minh', name: 'Mr. Minh', initials: 'M', degree: 'Thạc sĩ Ngôn ngữ học ứng dụng', skill: 'Reading & Listening', description: 'Cùng bạn phân tích lỗi sai, nhận diện paraphrase và lựa chọn chiến thuật phù hợp cho từng dạng bài.' },
] as const

export const HOME_PLANS = [
  { id: 'explore', name: 'Khởi động', price: 'Miễn phí', period: 'Bắt đầu theo nhịp của bạn', featured: false, benefits: ['Trải nghiệm đề luyện miễn phí', 'Highlight và ghi chú khi luyện tập', 'Tạo Flashcard cá nhân'], unavailable: ['Chấm bài cá nhân cùng Mentor'] },
  { id: 'practice', name: 'Space Practice', price: '299.000đ', period: '/ tháng · giá minh họa', featured: true, benefits: ['Kho bài luyện 4 kỹ năng', 'Luyện tập & mô phỏng thi thử', 'Flashcard kèm ảnh minh họa', 'Theo dõi tiến độ học tập'], unavailable: ['Chấm bài cá nhân cùng Mentor'] },
  { id: 'mentor', name: 'Space Mentor', price: '799.000đ', period: '/ tháng · giá minh họa', featured: false, benefits: ['Toàn bộ quyền lợi Space Practice', 'Mentor trực tiếp chấm Writing', 'Phản hồi Speaking theo tiêu chí', 'Định hướng kế hoạch ôn luyện'], unavailable: [] },
] as const
