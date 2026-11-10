import { useEffect, useState } from 'react'
import { ArrowRight, Award, BookOpenCheck, GraduationCap, Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  fetchPublicExaminers,
  SEEDED_EXAMINERS,
  type EnrichedExaminer,
} from '../examinerPublicApi'

export function TeacherSection() {
  const [examiners, setExaminers] = useState<readonly EnrichedExaminer[]>(SEEDED_EXAMINERS)

  useEffect(() => {
    const controller = new AbortController()
    fetchPublicExaminers(controller.signal)
      .then((loaded) => {
        if (!controller.signal.aborted && loaded.length > 0) {
          setExaminers(loaded)
        }
      })
      .catch(() => {
        // Keep seeded examiners when backend is offline
      })
    return () => controller.abort()
  }, [])

  return (
    <section id="home-mentors" className="home-teachers home-section" aria-labelledby="home-mentors-title">
      <div className="home-section-shell">
        <header className="home-display-heading home-teacher-heading">
          <span className="home-heading-icon"><BookOpenCheck aria-hidden="true" /></span>
          <div>
            <h2 id="home-mentors-title">150+ GIẢNG VIÊN <span>TRUYỀN CẢM HỨNG</span></h2>
          </div>
        </header>
        <div className="home-teacher-grid">
          {examiners.map((teacher) => (
            <article data-home-reveal className="home-teacher-card is-visible" key={teacher.id}>
              <Link
                to={`/mentors/${teacher.id}`}
                className="home-teacher-portrait-link"
                aria-label={`Xem chi tiết giảng viên ${teacher.displayName}`}
              >
                <div className="home-teacher-portrait">
                  <span className="home-teacher-band">{teacher.badgeLabel}</span>
                  <span className="home-teacher-halo" aria-hidden="true" />
                  <img
                    src={teacher.resolvedAvatarUrl}
                    data-fallback-src={teacher.fallbackAvatarUrl}
                    alt={`Chân dung ${teacher.displayName}`}
                    width="420"
                    height="430"
                    loading="lazy"
                    decoding="async"
                    onError={(event) => {
                      const img = event.currentTarget
                      if (img.src !== teacher.fallbackAvatarUrl) {
                        img.src = teacher.fallbackAvatarUrl
                      }
                    }}
                  />
                </div>
              </Link>
              <div className="home-teacher-nameplate">
                <h3>
                  <Link to={`/mentors/${teacher.id}`} className="home-teacher-title-link">
                    {teacher.displayName}
                  </Link>
                </h3>
                <p>{teacher.experienceLabel}</p>
              </div>
              <p className="home-teacher-description">{teacher.bio}</p>
              {teacher.certificates.length > 0 ? (
                <ul className="home-teacher-certs" aria-label={`Chứng chỉ của ${teacher.displayName}`}>
                  {teacher.certificates.slice(0, 2).map((cert) => (
                    <li key={`${cert.name}-${cert.year ?? ''}`}>
                      <Award aria-hidden="true" size={13} />
                      <span>{cert.name}{cert.score ? ` · ${cert.score}` : ''}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Button asChild size="icon" variant="outline" className="home-teacher-search">
                <Link to={`/mentors/${teacher.id}`} aria-label={`Xem hồ sơ ${teacher.displayName}`}>
                  <Search aria-hidden="true" />
                </Link>
              </Button>
            </article>
          ))}
        </div>
        <Button asChild className="home-orange-cta home-teacher-cta">
          <Link to={`/mentors/${examiners[0]?.id ?? 'experts'}`}>
            Xem hồ sơ chuyên gia <GraduationCap aria-hidden="true" /><ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  )
}
