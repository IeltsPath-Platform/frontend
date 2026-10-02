export const HOME_IMAGE_URLS = {
  introductionMain: 'https://thespace.edu.vn/_image?href=%2F_astro%2Fpv-hocba.B5Z0mx97.png&w=655&h=677&f=webp',
  introductionTeam: 'https://thespace.edu.vn/_image?href=%2F_astro%2Fthanhvien1_5x.f5A8DRDS.png&w=253&h=148&q=95&f=webp',
  commitment: 'https://thespace.edu.vn/_image?href=%2F_astro%2FBanner-ielts.o2pIMLkG.webp&w=669&h=585&f=webp',
  teacherLinhPhuong: 'https://thespace.edu.vn/_astro/gv-1.Dhf2KEyr.png',
  teacherYenChi: 'https://thespace.edu.vn/_astro/img-gv-2.DZIRbuF_.webp',
  teacherThuTrang: 'https://thespace.edu.vn/_astro/img-gv-4-Mai-Thu-Trang.C1w3Wx0E.webp',
} as const

export const HOME_ORBIT_FEATURES = [
  { id: 'adaptive', eyebrow: 'LỘ TRÌNH THÍCH ỨNG', title: 'HỌC THÍCH ỨNG AI - DEEPTUTOR CORE', description: 'Công nghệ AI DeepTutor cá nhân hóa Mastery Path theo từng kỹ năng, hỗ trợ tutor SSE 24/7.' },
  { id: 'assessment', eyebrow: 'ĐÁNH GIÁ NĂNG LỰC', title: 'ĐỀ THI CHUẨN - MOCK TEST ASSESSMENT', description: 'Ngân hàng câu hỏi chuẩn IELTS, phân tích chi tiết điểm mạnh/điểm yếu sau mỗi lần làm bài.' },
  { id: 'library', eyebrow: 'TỪ VỰNG & VIDEO', title: 'THƯ VIỆN CÁ NHÂN - PERSONAL LIBRARY', description: 'Lưu trữ vocab cá nhân, luyện tập qua Flashcard thông minh và theo dõi tiến độ bài giảng video.' },
  { id: 'grading', eyebrow: 'CHẤM BÀI CHUYÊN SÂU', title: 'CHẤM ĐIỂM KÉP - AI & HUMAN GRADING', description: 'Chấm AI tức thì qua Ví Point và đội ngũ chuyên gia chấm bài tự luận Speaking/Writing sâu sát.' },
] as const

export const HOME_COMMITMENTS = [
  { number: '01', title: 'CAM KẾT ĐẦU RA RÕ RÀNG, KHÔNG ĐẠT HỌC LẠI MIỄN PHÍ', description: 'Tự tin cam kết đầu ra với tư duy đề cao chất lượng hàng đầu. Học viên không đạt đầu ra được học lại miễn phí, mentor theo sát hỗ trợ.' },
  { number: '02', title: 'GIÁO TRÌNH NỘI BỘ TỰ BIÊN SOẠN ĐỘC QUYỀN', description: 'Giáo trình thiết kế mục tiêu đầu ra rõ ràng. Giúp học viên hiểu bản chất, hình thành tư duy, phát triển ý thay vì học thuộc lòng hay luyện đề máy móc.' },
  { number: '03', title: 'HỌC ĐỦ – ĐÚNG CẤP ĐỘ VỚI MOCK TEST CHUẨN IELTS', description: 'Bài thi đầu vào được mô phỏng theo cấu trúc, thời lượng và tiêu chuẩn chấm điểm của kỳ thi IELTS chính thức, giúp đánh giá chính xác năng lực và xây dựng lộ trình học phù hợp.' },
] as const

export const HOME_TEACHERS = [
  { slug: 'linh-phuong', badge: 'LISTENING 8.5', imageUrl: HOME_IMAGE_URLS.teacherLinhPhuong, name: 'THẠC SĨ LINH PHƯƠNG', experience: '12 Năm Kinh Nghiệm Giảng Dạy', description: 'Thạc sĩ Đại học Kinh tế Quốc dân, Cử nhân Đại học Khoa học Ứng dụng Kymenlaakso, Phần Lan (Học bổng).' },
  { slug: 'yen-chi', badge: 'OVERALL 8.5', imageUrl: HOME_IMAGE_URLS.teacherYenChi, name: 'GIẢNG VIÊN YẾN CHI', experience: 'Hơn 10 Năm Kinh Nghiệm Giảng Dạy Chứng Chỉ IELTS Và TOEIC', description: '2 lần đạt 8.5 IELTS, Đại sứ bài thi IELTS trên máy tính 2023 của IDP, Cố vấn Học thuật.' },
  { slug: 'thu-trang', badge: 'OVERALL 8.5', imageUrl: HOME_IMAGE_URLS.teacherThuTrang, name: 'GIẢNG VIÊN THU TRANG', experience: '4+ Năm Kinh Nghiệm Giảng Dạy IELTS', description: 'Cử nhân xuất sắc Đại học Kinh tế Quốc dân, Thành viên dự án nâng cao năng lực ngoại ngữ cho giáo viên.' },
] as const
