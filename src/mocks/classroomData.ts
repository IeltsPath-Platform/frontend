import type { ClassroomData } from '~types/classroom'

export const classroomData: ClassroomData = {
  courseName: 'IELTS Cất cánh',
  courseRange: '3.0 – IELTS 4.0+',
  studentName: 'Minh Anh',
  classCode: 'IE3-88',
  teacherName: 'Jessi Thuy Anh',
  schedule: 'Thứ 3-5-7 | 18:30 - 20:30',
  mentorName: 'Ms. Lan',
  sessions: [
    { id: 'session-01', sessionNumber: 1, weekday: 'Thứ 3', dateLabel: '07/09', courseLevel: 'IELTS 3.0', title: 'Bài 1: Nhập môn Anh ngữ', time: '18:30 - 20:30', status: 'completed', progressPercentage: 100 },
    { id: 'session-02', sessionNumber: 2, weekday: 'Thứ 5', dateLabel: '08/09', courseLevel: 'IELTS 3.0', title: 'Bài 1: Nature & Environment', time: '18:30 - 20:30', status: 'today', progressPercentage: 60 },
    { id: 'session-03', sessionNumber: 3, weekday: 'Thứ 7', dateLabel: '10/09', courseLevel: 'IELTS 3.0', title: 'Bài 2: Everyday Conversations', time: '18:30 - 20:30', status: 'upcoming', progressPercentage: 30 },
    { id: 'session-04', sessionNumber: 4, weekday: 'Thứ 3', dateLabel: '12/09', courseLevel: 'IELTS 3.0', title: 'Bài 2: Listening Foundations', time: '18:30 - 20:30', status: 'upcoming', progressPercentage: 30 },
    { id: 'session-05', sessionNumber: 5, weekday: 'Thứ 5', dateLabel: '14/09', courseLevel: 'IELTS 3.0', title: 'Bài 3: Building Vocabulary', time: '18:30 - 20:30', status: 'upcoming', progressPercentage: 30 },
    { id: 'session-06', sessionNumber: 6, weekday: 'Thứ 7', dateLabel: '16/09', courseLevel: 'IELTS 3.0', title: 'Bài 3: Grammar in Context', time: '18:30 - 20:30', status: 'locked', progressPercentage: 60 },
    { id: 'session-07', sessionNumber: 7, weekday: 'Thứ 3', dateLabel: '19/09', courseLevel: 'IELTS 3.0', title: 'Bài 4: Reading Strategies', time: '18:30 - 20:30', status: 'locked', progressPercentage: 0 },
    { id: 'session-08', sessionNumber: 8, weekday: 'Thứ 5', dateLabel: '21/09', courseLevel: 'IELTS 3.0', title: 'Bài 4: Speaking Practice', time: '18:30 - 20:30', status: 'locked', progressPercentage: 0 },
    { id: 'session-09', sessionNumber: 9, weekday: 'Thứ 7', dateLabel: '23/09', courseLevel: 'IELTS 3.0', title: 'Bài 5: Writing Structure', time: '18:30 - 20:30', status: 'locked', progressPercentage: 0 },
  ],
}
