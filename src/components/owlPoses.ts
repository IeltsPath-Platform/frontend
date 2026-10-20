import cheer from '@/assets/owl/hero-cheer.webp'
import confident from '@/assets/owl/hero-confident.webp'
import cool from '@/assets/owl/hero-cool.webp'
import confused from '@/assets/owl/hero-confused.webp'
import desk from '@/assets/owl/hero-desk.webp'
import idea from '@/assets/owl/hero-idea.webp'
import laptop from '@/assets/owl/hero-laptop.webp'
import party from '@/assets/owl/hero-party.webp'
import tired from '@/assets/owl/hero-tired.webp'
import wave from '@/assets/owl/hero-wave.webp'

/** The owl hero poses drawn in the Figma file (LMS TIS new version). */
export type OwlPose = 'idea' | 'cheer' | 'party' | 'confused' | 'confident' | 'cool' | 'wave' | 'tired' | 'desk' | 'laptop'

export const OWL_POSE_IMAGES: Record<OwlPose, string> = { idea, cheer, party, confused, confident, cool, wave, tired, desk, laptop }

/** Whether the user asked the OS to reduce motion; owls then stay still. */
export function prefersReducedMotion() {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}
