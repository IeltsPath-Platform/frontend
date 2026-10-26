import type { Profile, ProfileInput, Summary } from '../types'

export const BAND_OPTIONS = Array.from({ length: 19 }, (_, index) => index / 2)

/** "Đã nhận 7/10 bài hôm nay"; without a known limit, just the count. */
export function intakeText(summary: Pick<Summary, 'receivedToday' | 'dailyLimit'>) {
  return summary.dailyLimit
    ? `Đã nhận ${summary.receivedToday}/${summary.dailyLimit} bài hôm nay`
    : `Đã nhận ${summary.receivedToday} bài hôm nay`
}

/** How much of today's limit is used, 0 to 100; null when the limit is not known. */
export function intakePercent(summary: Pick<Summary, 'receivedToday' | 'dailyLimit'>) {
  return summary.dailyLimit ? Math.min(100, Math.round((summary.receivedToday / summary.dailyLimit) * 100)) : null
}

/** Learners cannot choose an examiner who has reached the limit until the next day. */
export const intakeFull = (summary: Pick<Summary, 'receivedToday' | 'dailyLimit'>) =>
  summary.dailyLimit != null && summary.receivedToday >= summary.dailyLimit

export const bandText =(band: number | null | undefined) => (band == null ? 'Chưa cập nhật' : band.toFixed(1))

/** The profile as the form edits it. Blank optional fields are sent as null. */
export function profileInput(profile: Pick<Profile, 'ieltsBand' | 'certificates' | 'acceptingSubmissions'>, patch: Partial<ProfileInput> = {}): ProfileInput {
  return {
    ieltsBand: profile.ieltsBand ?? null,
    certificates: profile.certificates.map((certificate) => ({
      name: certificate.name,
      issuer: certificate.issuer ?? null,
      year: certificate.year ?? null,
      score: certificate.score ?? null,
    })),
    acceptingSubmissions: profile.acceptingSubmissions,
    ...patch,
  }
}
