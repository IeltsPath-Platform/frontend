import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, GraduationCap, LayoutList } from 'lucide-react'
import { ClassProgressPanel } from '@/components/ClassProgressPanel'
import { SiteNavbar } from '@/components/SiteNavbar'
import { ClassMascot } from '@/components/ClassMascot'
import { classroomData } from '@/mocks/classroomData'
import { LessonDetailModal } from './components/LessonDetailModal'
import { ScheduleCard } from './components/ScheduleCard'
import type { ClassSession } from '~types/classroom'

export function ClassroomPage() {
  const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null)

  return (
    <div className="classroom-page">
      <a className="skip-link" href="#main-content">Chuyển đến nội dung chính</a>
      <SiteNavbar />
      <header className="classroom-hero">
        <div className="classroom-shell">
          <div className="classroom-hero-content">
            <div className="classroom-hero-copy"><ClassMascot className="classroom-class-mascot" size="md" /><h1>LỚP HỌC CỦA TÔI</h1><p>Xin chào {classroomData.studentName}</p><div className="classroom-class-meta"><span><CalendarDays aria-hidden="true" size={18} />Mã lớp: {classroomData.classCode}</span><span><GraduationCap aria-hidden="true" size={18} />Giáo viên: {classroomData.teacherName}</span><span><Clock3 aria-hidden="true" size={18} />Thời gian: {classroomData.schedule}</span></div></div>
            <ClassProgressPanel course={{ bandRange: classroomData.courseRange, name: classroomData.courseName }} surface="dark" />
          </div>
        </div>
      </header>
      <main id="main-content" tabIndex={-1} className="classroom-main classroom-shell">
        <section className="classroom-calendar-toolbar" aria-label="Điều khiển lịch học"><div className="classroom-month-controls"><h2>Tháng 9/2026</h2><Link to={`/classes/${classroomData.classCode}/join`} className="classroom-join-class">● Join class! Vào lớp ngay</Link><button type="button" aria-label="Tháng trước"><ChevronLeft aria-hidden="true" size={18} /></button><button type="button" aria-label="Tháng sau"><ChevronRight aria-hidden="true" size={18} /></button></div><div className="classroom-view-controls"><button className="is-active" type="button">Xem theo tháng</button><button type="button">Xem theo lộ trình</button><button type="button" aria-label="Chọn ngày"><CalendarDays aria-hidden="true" size={19} /></button><button type="button" aria-label="Xem dạng danh sách"><LayoutList aria-hidden="true" size={19} /></button></div></section>
        <section id="schedule" aria-labelledby="schedule-heading"><h2 id="schedule-heading" className="sr-only">Thời khóa biểu lớp học</h2><div className="classroom-schedule-grid">{classroomData.sessions.map((session) => <ScheduleCard key={session.id} session={session} onSelect={setSelectedSession} />)}</div></section>
        <aside className="classroom-mentor"><p>Mentor của bạn</p><div><span>L</span><section><h2>{classroomData.mentorName}</h2><p>IELTS Instructor</p></section></div><Link to={`/mentors/${classroomData.mentorName.toLowerCase().replaceAll('.', '').replaceAll(' ', '-')}`}>Nhắn Mentor</Link></aside>
      </main>
      {selectedSession ? <LessonDetailModal session={selectedSession} onClose={() => setSelectedSession(null)} /> : null}
    </div>
  )
}
