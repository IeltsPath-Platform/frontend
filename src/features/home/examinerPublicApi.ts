import { z } from 'zod'
import { apiRequest, getAccessToken } from '@/lib/httpClient'
import { HOME_IMAGE_URLS } from './homeData'

/**
 * Public base URL for the Supabase `avatars` bucket (`Buckets/avatars/...`).
 * Supports full URLs returned by `user-service` as well as relative bucket keys stored in `learner_profiles.avatar_reference`.
 */
export const SUPABASE_AVATARS_BUCKET_URL = (
  import.meta.env.VITE_SUPABASE_AVATARS_URL
  ?? 'https://kndrsdqzbzsaiuuruqno.supabase.co/storage/v1/object/public/avatars'
).replace(/\/+$/, '')

export const examinerCertificateSchema = z.object({
  name: z.string(),
  issuer: z.string().nullish(),
  year: z.number().nullish(),
  score: z.string().nullish(),
})

export const publicExaminerSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  avatarUrl: z.string().nullish(),
  bio: z.string().nullish(),
  ieltsBand: z.number().nullish(),
  certificates: z.array(examinerCertificateSchema).default([]),
  acceptingSubmissions: z.boolean().default(true),
})

export type ExaminerCertificate = z.infer<typeof examinerCertificateSchema>
export type PublicExaminer = z.infer<typeof publicExaminerSchema>

export interface EnrichedExaminer extends PublicExaminer {
  slug: string
  resolvedAvatarUrl: string
  fallbackAvatarUrl: string
  badgeLabel: string
  headline: string
  experienceLabel: string
  specialties: readonly string[]
  stats: {
    yearsExperience: string
    essaysGraded: string
    avgTurnaround: string
    studentSatisfaction: string
  }
}

/**
 * Resolves an examiner avatar reference into a full public URL pointing at Supabase `Buckets/avatars/...`.
 * Accepts:
 * - Full `http://` or `https://` URLs
 * - `Buckets/avatars/<key>`
 * - `avatars/<key>`
 * - `/storage/v1/object/public/avatars/<key>`
 * - `images/<userId>/<file>` or plain object key inside the `avatars` bucket
 */
export function resolveSupabaseAvatarUrl(
  rawReference: string | null | undefined,
  fallbackUrl: string = `${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000003/linh-phuong.png`,
): string {
  if (!rawReference || !rawReference.trim()) return fallbackUrl
  const trimmed = rawReference.trim()
  if (/^https?:\/\//i.test(trimmed)) return trimmed

  const normalized = trimmed
    .replace(/^\/+/, '')
    .replace(/^Buckets\/avatars\/+/i, '')
    .replace(/^avatars\/+/i, '')
    .replace(/^storage\/v1\/object\/public\/avatars\/+/i, '')
    .replace(/^\/+/, '')

  if (!normalized || normalized.includes('..')) return fallbackUrl
  return `${SUPABASE_AVATARS_BUCKET_URL}/${normalized}`
}

/**
 * Seeded fallback examiners matching `afterMigrate__demo_data.sql` in `user-service` (`user_db`),
 * used as initial SSR snapshot and offline fallback when the backend is unreachable.
 */
export const SEEDED_EXAMINERS: readonly EnrichedExaminer[] = [
  {
    id: '00000000-0000-0000-0000-000000000003',
    slug: 'linh-phuong',
    displayName: 'THẠC SĨ LINH PHƯƠNG',
    avatarUrl: `${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000003/linh-phuong.png`,
    resolvedAvatarUrl: `${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000003/linh-phuong.png`,
    fallbackAvatarUrl: HOME_IMAGE_URLS.teacherLinhPhuong,
    bio: 'Thạc sĩ Đại học Kinh tế Quốc dân, Cử nhân Đại học Khoa học Ứng dụng Kymenlaakso, Phần Lan (Học bổng). Chuyên sâu chấm chữa Writing học thuật & định hướng tư duy lập luận sắc bén.',
    ieltsBand: 8.5,
    badgeLabel: 'LISTENING 8.5',
    headline: '12 Năm Kinh Nghiệm Giảng Dạy',
    experienceLabel: '12 Năm Kinh Nghiệm Giảng Dạy',
    acceptingSubmissions: true,
    certificates: [
      { name: 'IELTS Academic', issuer: 'IDP Education', year: 2023, score: '8.5 Overall (Listening 8.5)' },
      { name: 'CELTA', issuer: 'Cambridge Assessment English', year: 2018, score: 'Pass A' },
      { name: 'Master of Economics & Management', issuer: 'National Economics University', year: 2016, score: 'Distinction' },
    ],
    specialties: ['Academic Writing Task 1 & 2', 'Critical Argumentation', 'Listening Band 8.5+ Strategy', 'Lexical Precision'],
    stats: {
      yearsExperience: '12+ năm',
      essaysGraded: '4.800+ bài',
      avgTurnaround: '< 24 giờ',
      studentSatisfaction: '99.4%',
    },
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    slug: 'yen-chi',
    displayName: 'GIẢNG VIÊN YẾN CHI',
    avatarUrl: `${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000004/yen-chi.webp`,
    resolvedAvatarUrl: `${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000004/yen-chi.webp`,
    fallbackAvatarUrl: HOME_IMAGE_URLS.teacherYenChi,
    bio: '2 lần đạt 8.5 IELTS, Đại sứ bài thi IELTS trên máy tính 2023 của IDP, Cố vấn Học thuật chấm chữa chuyên sâu Writing & Speaking chuẩn 4 tiêu chí.',
    ieltsBand: 8.5,
    badgeLabel: 'OVERALL 8.5',
    headline: 'Hơn 10 Năm Kinh Nghiệm Giảng Dạy Chứng Chỉ IELTS Và TOEIC',
    experienceLabel: 'Hơn 10 Năm Kinh Nghiệm Giảng Dạy Chứng Chỉ IELTS Và TOEIC',
    acceptingSubmissions: true,
    certificates: [
      { name: 'IELTS Academic (2x 8.5)', issuer: 'IDP Education', year: 2023, score: '8.5 Overall' },
      { name: 'IDP Computer-Delivered IELTS Ambassador', issuer: 'IDP Vietnam', year: 2023, score: 'Ambassador' },
      { name: 'TESOL International Certificate', issuer: 'Arizona State University', year: 2019, score: 'High Distinction' },
    ],
    specialties: ['Computer-Delivered IELTS', 'Coherence & Cohesion', 'Speaking Fluency & Idiomaticity', 'Band 7.0 -> 8.5 Breakthrough'],
    stats: {
      yearsExperience: '10+ năm',
      essaysGraded: '4.200+ bài',
      avgTurnaround: '< 18 giờ',
      studentSatisfaction: '99.2%',
    },
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    slug: 'thu-trang',
    displayName: 'GIẢNG VIÊN THU TRANG',
    avatarUrl: `${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000005/thu-trang.webp`,
    resolvedAvatarUrl: `${SUPABASE_AVATARS_BUCKET_URL}/images/0000-0000-0000-000000000005/thu-trang.webp`.replace('0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000005'),
    fallbackAvatarUrl: HOME_IMAGE_URLS.teacherThuTrang,
    bio: 'Cử nhân xuất sắc Đại học Kinh tế Quốc dân, Thành viên dự án nâng cao năng lực ngoại ngữ cho giáo viên. Tận tâm sửa từng lỗi ngữ pháp và phát âm cho học viên.',
    ieltsBand: 8.5,
    badgeLabel: 'OVERALL 8.5',
    headline: '4+ Năm Kinh Nghiệm Giảng Dạy IELTS',
    experienceLabel: '4+ Năm Kinh Nghiệm Giảng Dạy IELTS',
    acceptingSubmissions: true,
    certificates: [
      { name: 'IELTS Academic', issuer: 'British Council', year: 2023, score: '8.5 Overall' },
      { name: 'TESOL Methodology Specialist', issuer: 'Cambridge English', year: 2021, score: 'Grade A' },
      { name: 'Bachelor of Excellence', issuer: 'National Economics University', year: 2020, score: 'Honours' },
    ],
    specialties: ['Grammatical Range & Accuracy', 'Pronunciation & Intonation', 'Task 1 Data Synthesis', 'Foundation to 7.5+'],
    stats: {
      yearsExperience: '5+ năm',
      essaysGraded: '2.600+ bài',
      avgTurnaround: '< 16 giờ',
      studentSatisfaction: '99.6%',
    },
  },
]

const FALLBACK_PORTRAITS = [
  {
    supabase: `${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000003/linh-phuong.png`,
    local: HOME_IMAGE_URLS.teacherLinhPhuong,
  },
  {
    supabase: `${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000004/yen-chi.webp`,
    local: HOME_IMAGE_URLS.teacherYenChi,
  },
  {
    supabase: `${SUPABASE_AVATARS_BUCKET_URL}/images/00000000-0000-0000-0000-000000000005/thu-trang.webp`,
    local: HOME_IMAGE_URLS.teacherThuTrang,
  },
] as const

function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/**
 * Enriches a raw `PublicExaminer` row from `user-service` (`user_db`) with resolved Supabase `Buckets/avatars` URL,
 * certificate summary headline, badge label, and specialties for the Home and Examiner Detail landing pages.
 */
export function enrichExaminer(raw: PublicExaminer, index = 0): EnrichedExaminer {
  const matchedSeed = SEEDED_EXAMINERS.find(
    (seed) => seed.id === raw.id || slugifyName( raw.displayName ).includes(seed.slug),
  )
  const portraitPair = FALLBACK_PORTRAITS[index % FALLBACK_PORTRAITS.length]
  const fallbackAvatarUrl = matchedSeed?.fallbackAvatarUrl ?? portraitPair.local
  const resolvedAvatarUrl = resolveSupabaseAvatarUrl(
    raw.avatarUrl,
    matchedSeed?.resolvedAvatarUrl ?? portraitPair.supabase,
  )

  const bandText = raw.ieltsBand != null ? `OVERALL ${raw.ieltsBand.toFixed(1)}` : (matchedSeed?.badgeLabel ?? 'IELTS EXPERT')
  const firstCert = raw.certificates[0]
  const certSummary = firstCert
    ? [firstCert.name, firstCert.issuer, firstCert.year ? String(firstCert.year) : null, firstCert.score].filter(Boolean).join(' · ')
    : null

  const experienceLabel = matchedSeed?.experienceLabel
    ?? certSummary
    ?? 'Chuyên gia chấm chữa IELTS Writing & Speaking'

  return {
    ...raw,
    slug: matchedSeed?.slug ?? raw.id,
    resolvedAvatarUrl,
    fallbackAvatarUrl,
    badgeLabel: matchedSeed?.badgeLabel && raw.ieltsBand == null ? matchedSeed.badgeLabel : bandText,
    headline: certSummary ?? experienceLabel,
    experienceLabel,
    bio: raw.bio?.trim() || matchedSeed?.bio || 'Giảng viên và giám khảo chấm chữa chuyên sâu Writing & Speaking theo chuẩn 4 tiêu chí chấm thi quốc tế IDP & British Council.',
    certificates: raw.certificates.length > 0 ? raw.certificates : (matchedSeed?.certificates ?? []),
    specialties: matchedSeed?.specialties ?? [
      'Academic Writing Task 1 & 2',
      'Speaking Part 1–3 Coaching',
      '4-Criteria Band Diagnosis',
      'Lexical & Grammatical Upgrade',
    ],
    stats: matchedSeed?.stats ?? {
      yearsExperience: '8+ năm',
      essaysGraded: '3.000+ bài',
      avgTurnaround: '< 24 giờ',
      studentSatisfaction: '99.1%',
    },
  }
}

function optionalAuthHeaders(): Record<string, string> | undefined {
  const token = getAccessToken()
  return token ? { Authorization: `Bearer ${token}` } : undefined
}

/**
 * Fetches active examiners from `GET /api/users/examiners` (works for both guests and signed-in learners).
 */
export async function fetchPublicExaminers(signal?: AbortSignal): Promise<EnrichedExaminer[]> {
  const response = await apiRequest<unknown>('/api/users/examiners', {
    auth: false,
    headers: optionalAuthHeaders(),
    signal,
  })
  const parsed = z.array(publicExaminerSchema).parse(response)
  return parsed.map((item, idx) => enrichExaminer(item, idx))
}

/**
 * Fetches a single examiner by UUID or slug from `GET /api/users/examiners/{id}` or the public examiner list.
 */
export async function fetchPublicExaminerDetail(
  idOrSlug: string,
  signal?: AbortSignal,
): Promise<{ examiner: EnrichedExaminer; allExaminers: EnrichedExaminer[] }> {
  const cleanParam = idOrSlug.trim()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanParam)

  const listPromise = fetchPublicExaminers(signal).catch(() => [...SEEDED_EXAMINERS])
  const directPromise = isUuid
    ? apiRequest<unknown>(`/api/users/examiners/${cleanParam}`, {
      auth: false,
      headers: optionalAuthHeaders(),
      signal,
    })
      .then((data) => enrichExaminer(publicExaminerSchema.parse(data)))
      .catch(() => null)
    : Promise.resolve(null)

  const [allLoaded, directExaminer] = await Promise.all([listPromise, directPromise])
  const allExaminers = allLoaded.length > 0 ? allLoaded : [...SEEDED_EXAMINERS]

  if (directExaminer) {
    const mergedList = allExaminers.some((item) => item.id === directExaminer.id)
      ? allExaminers.map((item) => (item.id === directExaminer.id ? directExaminer : item))
      : [directExaminer, ...allExaminers]
    return { examiner: directExaminer, allExaminers: mergedList }
  }

  const matchedInList = allExaminers.find(
    (item) =>
      item.id.toLowerCase() === cleanParam.toLowerCase()
      || item.slug.toLowerCase() === cleanParam.toLowerCase()
      || slugifyName(item.displayName) === cleanParam.toLowerCase(),
  )
  if (matchedInList) {
    return { examiner: matchedInList, allExaminers }
  }

  const matchedSeed = SEEDED_EXAMINERS.find(
    (item) => item.id.toLowerCase() === cleanParam.toLowerCase() || item.slug.toLowerCase() === cleanParam.toLowerCase(),
  )
  if (matchedSeed) {
    return { examiner: matchedSeed, allExaminers }
  }

  return { examiner: allExaminers[0] ?? SEEDED_EXAMINERS[0], allExaminers }
}
