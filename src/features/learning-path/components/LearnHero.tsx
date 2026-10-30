import type { ReactNode } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { isDarkArt } from '../lib/courseMeta'
import { CourseCoverArt } from './CourseCoverArt'

export interface HeroFact {
  icon: ReactNode
  label: ReactNode
}

interface LearnHeroProps {
  /** Band of the course; picks the illustration. Without it the hero has no picture. */
  band: number | null
  coverImageUrl?: string | null
  eyebrow: string
  title: string
  lead?: string | null
  facts: HeroFact[]
  /** Shown as a success line, e.g. when everything here is passed. */
  done?: string | null
}

/** Banner of a course or a topic: the band's mountain fills it, the text sits on its open sky. */
export function LearnHero({ band, coverImageUrl, eyebrow, title, lead, facts, done }: LearnHeroProps) {
  const hasCover = Boolean(coverImageUrl?.trim())
  return (
    <header className={`lp-hero${band !== null && isDarkArt(band) ? ' lp-hero--dark' : ''}${hasCover ? ' lp-hero--photo' : ''}`}>
      {band !== null ? (
        <div className="lp-hero__art" aria-hidden="true">
          <CourseCoverArt band={band} coverImageUrl={coverImageUrl} wide loading="eager" />
        </div>
      ) : null}

      <div className="lp-hero__text">
        <p className="lp-eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        {lead ? <p className="lp-hero__lead">{lead}</p> : null}

        {facts.length > 0 ? (
          <ul className="lp-hero__facts" aria-label="Thông tin">
            {facts.map((fact, index) => (
              <li key={index}>
                {fact.icon}
                {fact.label}
              </li>
            ))}
          </ul>
        ) : null}

        {done ? (
          <p className="lp-hero__done">
            <CheckCircle2 aria-hidden="true" size={18} />
            {done}
          </p>
        ) : null}
      </div>
    </header>
  )
}
