export type ReactionType = 'LIKE' | 'LOVE' | 'HELPFUL' | 'ACCURATE'

export interface ReactionMeta {
  type: ReactionType
  label: string
  color: string
  bgColor: string
  activeTextColor: string
}

export const REACTION_META: Record<ReactionType, ReactionMeta> = {
  LIKE: {
    type: 'LIKE',
    label: 'Thích',
    color: '#1877F2',
    bgColor: '#E7F3FF',
    activeTextColor: '#1877F2',
  },
  LOVE: {
    type: 'LOVE',
    label: 'Yêu thích',
    color: '#FA383E',
    bgColor: '#FFEBEF',
    activeTextColor: '#E41E3F',
  },
  HELPFUL: {
    type: 'HELPFUL',
    label: 'Hữu ích',
    color: '#F7B125',
    bgColor: '#FFF8E6',
    activeTextColor: '#D97706',
  },
  ACCURATE: {
    type: 'ACCURATE',
    label: 'Chính xác',
    color: '#00A86B',
    bgColor: '#E6F7F0',
    activeTextColor: '#059669',
  },
}

export const REACTION_LIST: ReactionType[] = ['LIKE', 'LOVE', 'HELPFUL', 'ACCURATE']

export const CATEGORY_LABELS: Record<string, string> = {
  GENERAL: 'Chung',
  QUESTION: 'Hỏi đáp',
  DISCUSSION: 'Thảo luận',
  WRITING_SHARING: 'Chia sẻ Writing',
  SPEAKING_PARTNER: 'Tìm bạn Speaking',
  RESOURCE_TIPS: 'Tài nguyên & mẹo',
}

export const CATEGORY_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  GENERAL: { bg: '#EEF4FF', text: '#2950A9', border: '#D0E0FF' },
  QUESTION: { bg: '#FFF1F3', text: '#C01048', border: '#FECDCA' },
  DISCUSSION: { bg: '#F0FDF4', text: '#14532D', border: '#DCFCE7' },
  WRITING_SHARING: { bg: '#F8F5FF', text: '#6927DA', border: '#E9D7FE' },
  SPEAKING_PARTNER: { bg: '#EFF8FF', text: '#175CD3', border: '#B2DDFF' },
  RESOURCE_TIPS: { bg: '#FFFBEB', text: '#B54708', border: '#FEDF89' },
}

export function safeVideoEmbed(raw: string): string | null {
  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') return null
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(url.hostname)) {
      const id = url.hostname === 'youtu.be'
        ? url.pathname.split('/')[1]
        : url.searchParams.get('v') ?? url.pathname.match(/^\/embed\/([\w-]+)/)?.[1]
      return id && /^[\w-]{6,20}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
    if (['loom.com', 'www.loom.com'].includes(url.hostname)) {
      const id = url.pathname.match(/^\/share\/([\w-]+)/)?.[1]
      return id ? `https://www.loom.com/embed/${id}` : null
    }
  } catch {
    return null
  }
  return null
}

