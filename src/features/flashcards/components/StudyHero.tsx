import type { CSSProperties, ReactNode } from 'react'
import { Sparkles } from 'lucide-react'
import { OwlHero } from '@/components/OwlHero'
import type { OwlPose } from '@/components/owlPoses'
import '../flashcards.css'
import '../study-stage.css'

const DRIFTING_MARKS = ['/ɪ/', 'Aa', '/θ/', 'IELTS', '/ʃ/', 'abc', '/æ/', 'B2']

/** Pronunciation symbols and letters drifting behind a hero. Decoration only. */
export function StudyDecor() {
  return (
    <div className="study-decor" aria-hidden="true">
      {DRIFTING_MARKS.map((mark, index) => (
        <span key={mark} style={{ '--drift-delay': `${index * -1.7}s` } as CSSProperties}>{mark}</span>
      ))}
    </div>
  )
}

interface StudyHeroProps {
  eyebrow: string
  title: string
  subtitle?: string
  progress?: { label: string; value: number; max: number }
  /** Shown top right, for example the exit button of a session. */
  action?: ReactNode
  /** Shown beside the eyebrow, for example the current streak. */
  badge?: ReactNode
  /** Screens with an owl coach beside the card leave this out, so only one owl is on screen. */
  owlPose?: OwlPose
}

/** Animated banner at the top of every study and review screen, carrying the session title and progress. */
export function StudyHero({ eyebrow, title, subtitle, progress, action, badge, owlPose }: StudyHeroProps) {
  const percent = progress && progress.max > 0 ? Math.round((progress.value / progress.max) * 100) : 0
  return (
    <section className="study-hero" aria-label={title}>
      <StudyDecor />
      <div className="study-hero__copy">
        <div className="study-hero__top">
          <p className="study-hero__eyebrow"><Sparkles size={15} aria-hidden="true" />{eyebrow}</p>
          {badge}
        </div>
        <h1>{title}</h1>
        {subtitle && <p className="study-hero__lead">{subtitle}</p>}
        {progress && (
          <div className="study-hero__progress">
            <span><b>{progress.label}</b> {progress.value}/{progress.max}</span>
            <em>{percent}%</em>
            <div role="progressbar" aria-label={progress.label} aria-valuemin={0} aria-valuemax={progress.max} aria-valuenow={progress.value}>
              <i style={{ inlineSize: `${percent}%` }} />
            </div>
          </div>
        )}
      </div>
      <div className="study-hero__side">
        {action && <div className="study-hero__action">{action}</div>}
        {owlPose ? <OwlHero pose={owlPose} motion="calm" size="xs" alt="" /> : (
          <div className="study-hero__cards" aria-hidden="true"><i>Aa</i><i>/ɪ/</i><i>✓</i></div>
        )}
      </div>
    </section>
  )
}
