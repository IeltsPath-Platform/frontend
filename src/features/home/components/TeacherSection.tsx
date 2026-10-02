import { ArrowRight, BookOpenCheck, GraduationCap, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { HOME_TEACHERS } from '../homeData'

export function TeacherSection() {
  return (
    <section id="home-mentors" className="home-teachers home-section" aria-labelledby="home-mentors-title">
      <div className="home-section-shell">
        <header className="home-display-heading home-teacher-heading"><span className="home-heading-icon"><BookOpenCheck aria-hidden="true" /></span><div><h2 id="home-mentors-title">150+ GIẢNG VIÊN <span>TRUYỀN CẢM HỨNG</span></h2></div></header>
        <div className="home-teacher-grid">
          {HOME_TEACHERS.map((teacher) => <article data-home-reveal className="home-teacher-card" key={teacher.slug}><div className="home-teacher-portrait"><span className="home-teacher-band">{teacher.badge}</span><span className="home-teacher-halo" aria-hidden="true" /><img src={teacher.imageUrl} alt={`Chân dung ${teacher.name}`} width="420" height="430" loading="lazy" decoding="async" /></div><div className="home-teacher-nameplate"><h3>{teacher.name}</h3><p>{teacher.experience}</p></div><p className="home-teacher-description">{teacher.description}</p><Button asChild size="icon" variant="outline" className="home-teacher-search"><Link to={`/mentors/${teacher.slug}`} aria-label={`Xem hồ sơ ${teacher.name}`}><Search aria-hidden="true" /></Link></Button></article>)}
        </div>
        <Button asChild className="home-orange-cta home-teacher-cta"><Link to="/mentors/experts">Xem hồ sơ chuyên gia <GraduationCap aria-hidden="true" /><ArrowRight aria-hidden="true" /></Link></Button>
      </div>
    </section>
  )
}
